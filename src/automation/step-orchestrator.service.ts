import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { TriggerEngineService } from './trigger-engine.service';
import { EventsService } from '../events/events.service';

type AdvanceOptions = {
  cause?: 'event' | 'manual' | 'timer';
  correlationId?: string;
  actorTenantUserId?: number;
};

type EngineState = 'pending' | 'ready' | 'in_progress' | 'completed' | 'blocked' | 'canceled';

@Injectable()
export class StepOrchestratorService {
  constructor(
    private readonly ds: DataSource,
    private readonly triggers: TriggerEngineService,
    private readonly events: EventsService,
  ) {}

  async attemptAdvance(stepInstanceId: number, opts: AdvanceOptions = {}) {
    const qr = await this.begin();
    try {
      const s = await this.loadStepLocked(qr, stepInstanceId);
      if (!s) return await this.rollback(qr);
      if (['completed', 'canceled', 'blocked'].includes(s.status)) {
        return await this.rollback(qr);
      }


      const allMandatoryApproved = await this.checkRequirements(qr, s.step_instance_id);
      const triggersMet = await this.evaluateTriggers(qr, s.process_instance_id, s.step_instance_id);

      const now = new Date();
      
      // pending -> ready
      console.log(`StepOrchestrator: step ${s.step_instance_id} status=${s.status}, allMandatoryApproved=${allMandatoryApproved}, triggersMet=${triggersMet}`);
      if (s.status === 'pending' && allMandatoryApproved && triggersMet) {
        await this.setState(qr, s.step_instance_id, 'ready', { ready_at: now });
        await this.syncTaskColumn(qr, s.step_instance_id, 'ready');
        this.events.emit('six1-event.process_step_ready', {
          entity: { entityType: 'ProcessStep', entityId: s.step_instance_id },
          data: { processInstanceId: s.process_instance_id, stepOrder: s.step_order, cause: opts.cause ?? 'event' },
          correlationId: opts.correlationId,
        });
      }

      
      // Handle automated steps: ready -> in_progress -> completed
      const fresh = await this.loadStepLocked(qr, s.step_instance_id);
      if (fresh.task_type === 'automated' && fresh.status === 'ready' && allMandatoryApproved && triggersMet) {
        await this.setState(qr, fresh.step_instance_id, 'in_progress', { started_at: now });
        await this.syncTaskColumn(qr, fresh.step_instance_id, 'in_progress');
        this.events.emit('six1-event.process_step_started', {
          entity: { entityType: 'ProcessStep', entityId: fresh.step_instance_id },
          data: { processInstanceId: fresh.process_instance_id, stepOrder: fresh.step_order, cause: opts.cause ?? 'event' },
          correlationId: opts.correlationId,
        });
        
        //Instant completion (replace with your actual automation)
        await this.setState(qr, fresh.step_instance_id, 'completed', { completed_at: new Date() });
        await this.syncTaskColumn(qr, fresh.step_instance_id, 'completed');
        this.events.emit('six1-event.process_step_completed', {
          entity: { entityType: 'ProcessStep', entityId: fresh.step_instance_id },
          data: { processInstanceId: fresh.process_instance_id, stepOrder: fresh.step_order, cause: opts.cause ?? 'event' },
          correlationId: opts.correlationId,
        });

        await this.enableNextSteps(qr, fresh.process_instance_id, fresh.step_order, opts);
        await this.checkAndCompleteProjectIfDone(qr, fresh.process_instance_id, opts);
      }

      await qr.commitTransaction();
    } catch (e) {
      await this.safeRollback(qr);
      throw e;
    } finally {
      await this.release(qr);
    }
  }

  async markCompleted(stepInstanceId: number, opts: AdvanceOptions = {}) {
    const qr = await this.begin();
    try {
      const s = await this.loadStepLocked(qr, stepInstanceId);
      if (!s) return await this.rollback(qr);
      if (!['ready', 'in_progress'].includes(s.status)) return await this.rollback(qr);

      await this.setState(qr, s.step_instance_id, 'completed', { completed_at: new Date() });
      await this.syncTaskColumn(qr, s.step_instance_id, 'completed');
      this.events.emit('six1-event.notification.process_step_completed', {
        entity: { entityType: 'ProcessStep', entityId: s.step_instance_id },
        data: { processInstanceId: s.process_instance_id, stepOrder: s.step_order, cause: opts.cause ?? 'manual' },
        correlationId: opts.correlationId,
      });

      await this.enableNextSteps(qr, s.process_instance_id, s.step_order, opts);
      await this.checkAndCompleteProjectIfDone(qr, s.process_instance_id, opts);
      await qr.commitTransaction();
    } catch (e) {
      await this.safeRollback(qr);
      throw e;
    } finally {
      await this.release(qr);
    }
  }

  // ---- internals ----

  private async checkRequirements(qr: QueryRunner, stepInstanceId: number): Promise<boolean> {
    const rows = await qr.manager.query(
      `SELECT is_mandatory, status
         FROM process_instance_step_requirements
        WHERE step_instance_id = ?`,
      [stepInstanceId],
    );
    return rows.filter((r: any) => r.is_mandatory === 1).every((r: any) => r.status === 'approved');
  }

  private async evaluateTriggers(qr: QueryRunner, processInstanceId: number, stepInstanceId: number): Promise<boolean> {
    const ctx = await this.buildContext(qr, processInstanceId, stepInstanceId);
    const triggers = await qr.manager.query(
      `SELECT trigger_instance_id, json_schema
         FROM process_instance_step_triggers
        WHERE step_instance_id = ?`,
      [stepInstanceId],
    );

    let allMet = true;
    for (const t of triggers) {
      const met = await this.triggers.evaluate(t.json_schema, ctx);
      if (met) {
        await qr.manager.query(
          `UPDATE process_instance_step_triggers
              SET status='met', met_at = NOW(), last_eval_at = NOW()
            WHERE trigger_instance_id = ?`,
          [t.trigger_instance_id],
        );
      } else {
        allMet = false;
        await qr.manager.query(
          `UPDATE process_instance_step_triggers
              SET last_eval_at = NOW()
            WHERE trigger_instance_id = ?`,
          [t.trigger_instance_id],
        );
      }
    }
    return allMet;
  }
  
  private async enableNextSteps(qr: QueryRunner, processInstanceId: number, currentOrder: number, opts: AdvanceOptions) {
    const nextRows = await qr.manager.query(
      `SELECT step_instance_id, step_order
         FROM process_instance_steps
        WHERE process_instance_id = ? AND step_order = ? AND status = 'pending' FOR UPDATE`,
      [processInstanceId, currentOrder + 1],
    );

    for (const row of nextRows) {
      const okReq = await this.checkRequirements(qr, row.step_instance_id);
      const okTrig = await this.evaluateTriggers(qr, processInstanceId, row.step_instance_id);
      if (okReq && okTrig) {
        await this.setState(qr, row.step_instance_id, 'ready', { ready_at: new Date() });
        await this.syncTaskColumn(qr, row.step_instance_id, 'ready');
        this.events.emit('six1-event.process_step_task_created', {
          entity: { entityType: 'ProcessStep', entityId: row.step_instance_id },
          data: { processInstanceId, stepOrder: row.step_order, cause: opts.cause ?? 'event' },
          correlationId: opts.correlationId,
        });
      }
    }
  }

  private async buildContext(qr: QueryRunner, processInstanceId: number, stepInstanceId: number) {
    const [proc] = await qr.manager.query(
      `SELECT tenant_id, process_template_id
         FROM process_instances
        WHERE process_instance_id = ?`,
      [processInstanceId],
    );
    const reqRows = await qr.manager.query(
      `SELECT is_mandatory, status
         FROM process_instance_step_requirements
        WHERE step_instance_id = ?`,
      [stepInstanceId],
    );
    const allReqApproved = reqRows.filter((r: any) => r.is_mandatory === 1).every((r: any) => r.status === 'approved');

    return {
      tenantId: proc?.tenant_id,
      processTemplateId: proc?.process_template_id,
      processInstanceId,
      step: { id: stepInstanceId, allRequiredSubmissionsApproved: allReqApproved },
      now: new Date().toISOString(),
    };
  }

  private async loadStepLocked(qr: QueryRunner, stepInstanceId: number): Promise<any | null> {
    const [row] = await qr.manager.query(
      `SELECT * FROM process_instance_steps WHERE step_instance_id = ? FOR UPDATE`,
      [stepInstanceId],
    );
    return row ?? null;
  }

  private async setState(
    qr: QueryRunner,
    stepInstanceId: number,
    next: EngineState,
    times: Partial<{ ready_at: Date; started_at: Date; completed_at: Date; canceled_at: Date }> = {},
  ) {
    await qr.manager.query(
      `UPDATE process_instance_steps
          SET status = ?,
              ready_at = COALESCE(?, ready_at),
              started_at = COALESCE(?, started_at),
              completed_at = COALESCE(?, completed_at),
              canceled_at = COALESCE(?, canceled_at),
              updated_at = NOW()
        WHERE step_instance_id = ?`,
      [next, times.ready_at ?? null, times.started_at ?? null, times.completed_at ?? null, times.canceled_at ?? null, stepInstanceId],
    );
  }

  /**
   * Move the task's Kanban column based on mapping for the given engine state.
   * - Only applies to tasks with status_control IN ('process','hybrid')
   * - Prefers per-step override mapping; falls back to project-level default mapping
   */
  private async syncTaskColumn(qr: QueryRunner, stepInstanceId: number, engineState: EngineState): Promise<void> {
    // Find the engine-controlled task linked to this step
    const [task] = await qr.manager.query(
      `SELECT t.task_id, t.project_id, t.status_control
         FROM tasks t
        WHERE t.step_instance_id = ?
        LIMIT 1`,
      [stepInstanceId],
    );
    if (!task) return;
    if (!['process', 'hybrid'].includes(task.status_control)) return;

    // Resolve mapped column
    const [map] = await qr.manager.query(
      `SELECT m.task_status_id
         FROM project_step_status_mappings m
        WHERE m.project_id = ?
          AND m.step_engine_state = ?
          AND (m.step_instance_id = ? OR m.step_instance_id IS NULL)
        ORDER BY m.step_instance_id IS NULL ASC
        LIMIT 1`,
      [task.project_id, engineState, stepInstanceId],
    );
    if (!map?.task_status_id) return;

    // Idempotent column update
    await qr.manager.query(
      `UPDATE tasks
          SET task_status_id = ?, updated_at = NOW()
        WHERE task_id = ?`,
      [map.task_status_id, task.task_id],
    );

      // Emit event for notification pipeline (fire-and-forget)
      this.events.emit('six1-event.notification.task_status_changed', {
        userId: 1, // or the actor if you have it in scope
        entity: { entityType: 'Task', entityId: task.task_id },
        data: {
          projectId: task.project_id,
          stepInstanceId,
          toStatusId: map.task_status_id,
          engineState,
        },
      });
  }


  /**
   * If all steps of the process instance are completed, mark the project completed.
   * Assumes `projects` has `status` ENUM and `completed_at` DATETIME.
   * Tries to resolve `project_id` via `process_instances` first; falls back to task-link if needed.
   */
  private async checkAndCompleteProjectIfDone(qr: QueryRunner, processInstanceId: number, opts: AdvanceOptions) {
    const [agg] = await qr.manager.query(
      `SELECT 
         SUM(s.status = 'completed') AS completed_count,
         COUNT(*) AS total_count
       FROM process_instance_steps s
       WHERE s.process_instance_id = ?`,
      [processInstanceId],
    );

    if (!agg || Number(agg.total_count) === 0) return;
    if (Number(agg.completed_count) !== Number(agg.total_count)) return;

    // Resolve project_id (prefer process_instances.project_id if present)
    let projectId: number | null = null;

    const [pi] = await qr.manager.query(
      `SELECT project_id FROM projects WHERE process_instance_id = ? LIMIT 1`,
      [processInstanceId],
    );
    if (pi?.project_id) {
      projectId = Number(pi.project_id);
    } else {
      // Fallback: find any task linked to any step in this process to get project_id
      const [t] = await qr.manager.query(
        `SELECT t.project_id
           FROM tasks t
           JOIN process_instance_steps s ON s.step_instance_id = t.step_instance_id
          WHERE s.process_instance_id = ?
          LIMIT 1`,
        [processInstanceId],
      );
      if (t?.project_id) projectId = Number(t.project_id);
    }

    if (!projectId) return;

    // Mark project completed (idempotent)
    await qr.manager.query(
      `UPDATE projects
          SET status = 'completed',
              completed_at = COALESCE(completed_at, NOW()),
              updated_at = NOW()
        WHERE project_id = ? AND status <> 'completed'`,
      [projectId],
    );
    
    // Emit event for notification pipeline (fire-and-forget)
    this.events.emit('six1-event.notification.project_status_changed', {
      userId: opts.actorTenantUserId ?? 1,
      entity: { entityType: 'Project', entityId: projectId },
      data: { processInstanceId },
      correlationId: opts.correlationId,
    });
  }

  private async begin(): Promise<QueryRunner> {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    return qr;
  }
  private async rollback(qr: QueryRunner) { await qr.rollbackTransaction(); }
  private async safeRollback(qr: QueryRunner) { try { await qr.rollbackTransaction(); } catch {} }
  private async release(qr: QueryRunner) { try { await qr.release(); } catch {} }
}
