// src/automation/step-orchestrator.service.ts
/**
 * StepOrchestratorService
 * -----------------------
 * Purpose:
 *  - Orchestrates the lifecycle of process step *instances*.
 *  - Transitions steps through states (pending → ready → in_progress → completed / blocked / canceled).
 *  - Evaluates *requirements* and *triggers* to determine if a step can advance.
 *  - Emits domain events for downstream consumers (audit, projections, async workers).
 *
 * Concurrency & Consistency:
 *  - All public mutating methods open a DB transaction via QueryRunner.
 *  - The current step row is read with `FOR UPDATE` (pessimistic lock) to ensure idempotency under concurrency.
 *  - Transitions are *idempotent* where possible (repeated calls have no effect if already terminal or not eligible).
 *
 * Eventing:
 *  - Emits `six1-event.step.ready`, `six1-event.step.started`, `six1-event.step.completed`.
 *  - Emissions are *after* state is persisted but still within the same method scope.
 *    If you need exactly-once event delivery, consider an outbox pattern.
 *
 * Progression Model:
 *  - `enableNextSteps` currently assumes *linear* progression by `step_order`.
 *    Replace with a dependency-graph approach if steps can branch/merge.
 */

import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { TriggerEngineService } from './trigger-engine.service';
import { DomainEventsService } from '../events/domain-events.service';

/**
 * Metadata accompanying step transitions.
 * @property cause - Origin of the transition (user action, event, or timer).
 * @property correlationId - For traceability across services.
 * @property actorTenantUserId - The user performing the action (manual flows).
 */
type AdvanceOptions = {
  cause?: 'event' | 'manual' | 'timer';
  correlationId?: string;
  actorTenantUserId?: number;
};

@Injectable()
export class StepOrchestratorService {
  constructor(
    private readonly ds: DataSource,
    private readonly triggers: TriggerEngineService,
    private readonly events: DomainEventsService,
  ) {}

  /**
   * Idempotently attempts to advance a step.
   *
   * Transitions:
   *  - pending → ready (iff all *mandatory* requirements are approved AND all triggers evaluate to met)
   *  - automated steps: ready → in_progress → completed (auto-run path)
   *
   * Concurrency:
   *  - Locks the step row with `FOR UPDATE`.
   *  - If step is already terminal (`completed`, `canceled`, `blocked`) the method exits without changes.
   *
   * Side effects:
   *  - Emits events for `ready`, `started`, and `completed`.
   */
  async attemptAdvance(stepInstanceId: number, opts: AdvanceOptions = {}) {
    const qr = await this.begin();
    try {
      // Lock the step row to avoid concurrent state transitions.
      const s = await this.loadStepLocked(qr, stepInstanceId);
      if (!s) return await this.rollback(qr); // Step not found; noop.

      // Terminal or non-actionable states → no-op.
      if (['completed', 'canceled', 'blocked'].includes(s.status)) {
        return await this.rollback(qr);
      }

      // Evaluate gate conditions for this step.
      const allMandatoryApproved = await this.checkRequirements(qr, s.step_instance_id);
      const triggersMet = await this.evaluateTriggers(qr, s.process_instance_id, s.step_instance_id);

      const now = new Date();

      // Gate 1: pending → ready (only when both requirements & triggers are satisfied).
      if (s.status === 'pending' && allMandatoryApproved && triggersMet) {
        await this.setState(qr, s.step_instance_id, 'ready', { ready_at: now });
        this.events.emit('six1-event.step.ready', {
          entity: { entityType: 'ProcessStep', entityId: s.step_instance_id },
          data: { processInstanceId: s.process_instance_id, stepOrder: s.step_order, cause: opts.cause ?? 'event' },
          correlationId: opts.correlationId,
        });
      }

      // Refresh after potential state change to avoid stale reads.
      const fresh = await this.loadStepLocked(qr, s.step_instance_id);

      // Auto-run path for automated steps: ready → in_progress → completed.
      if (fresh.task_type === 'automated' && fresh.status === 'ready') {
        await this.setState(qr, fresh.step_instance_id, 'in_progress', { started_at: now });
        this.events.emit('six1-event.step.started', {
          entity: { entityType: 'ProcessStep', entityId: fresh.step_instance_id },
          data: { processInstanceId: fresh.process_instance_id, stepOrder: fresh.step_order, cause: opts.cause ?? 'event' },
          correlationId: opts.correlationId,
        });

        // TODO: Replace demo auto-complete with actual automation call / worker integration.
        await this.setState(qr, fresh.step_instance_id, 'completed', { completed_at: new Date() });
        this.events.emit('six1-event.step.completed', {
          entity: { entityType: 'ProcessStep', entityId: fresh.step_instance_id },
          data: { processInstanceId: fresh.process_instance_id, stepOrder: fresh.step_order, cause: opts.cause ?? 'event' },
          correlationId: opts.correlationId,
        });

        // Attempt to unlock and ready the next step(s).
        await this.enableNextSteps(qr, fresh.process_instance_id, fresh.step_order, opts);
      }

      await qr.commitTransaction();
    } catch (e) {
      // Defensive rollback; swallow rollback errors but rethrow the original.
      await this.safeRollback(qr);
      throw e;
    } finally {
      // Ensure connection is released back to the pool.
      await this.release(qr);
    }
  }

  /**
   * Marks a *manual* step completed and cascades readiness to next steps.
   * Safe to call repeatedly (idempotent if already completed).
   *
   * Preconditions:
   *  - Step must be in `ready` or `in_progress`.
   *
   * Side effects:
   *  - Emits `step.completed`.
   *  - Attempts to enable next steps (linear progression).
   */
  async markCompleted(stepInstanceId: number, opts: AdvanceOptions = {}) {
    const qr = await this.begin();
    try {
      const s = await this.loadStepLocked(qr, stepInstanceId);
      if (!s) return await this.rollback(qr);
      if (!['ready', 'in_progress'].includes(s.status)) return await this.rollback(qr);

      await this.setState(qr, s.step_instance_id, 'completed', { completed_at: new Date() });
      this.events.emit('six1-event.step.completed', {
        entity: { entityType: 'ProcessStep', entityId: s.step_instance_id },
        data: { processInstanceId: s.process_instance_id, stepOrder: s.step_order, cause: opts.cause ?? 'manual' },
        correlationId: opts.correlationId,
      });

      await this.enableNextSteps(qr, s.process_instance_id, s.step_order, opts);
      await qr.commitTransaction();
    } catch (e) {
      await this.safeRollback(qr);
      throw e;
    } finally {
      await this.release(qr);
    }
  }

  /**
   * Optionally move a *manual* step from `ready` → `in_progress` when a human starts work.
   * Useful for tracking SLA / duration metrics (started_at).
   */
  async markStarted(stepInstanceId: number, opts: AdvanceOptions = {}) {
    const qr = await this.begin();
    try {
      const s = await this.loadStepLocked(qr, stepInstanceId);
      if (!s) return await this.rollback(qr);
      if (s.status !== 'ready') return await this.rollback(qr);

      await this.setState(qr, s.step_instance_id, 'in_progress', { started_at: new Date() });
      this.events.emit('six1-event.step.started', {
        entity: { entityType: 'ProcessStep', entityId: s.step_instance_id },
        data: { processInstanceId: s.process_instance_id, stepOrder: s.step_order, cause: opts.cause ?? 'manual' },
        correlationId: opts.correlationId,
      });
      await qr.commitTransaction();
    } catch (e) {
      await this.safeRollback(qr);
      throw e;
    } finally {
      await this.release(qr);
    }
  }

  // ---------- internals ----------

  /**
   * Checks whether *all mandatory* requirements for a step are approved.
   * Reads from `process_instance_step_requirements`.
   * @returns true if every mandatory requirement has status='approved'.
   */
  private async checkRequirements(qr: QueryRunner, stepInstanceId: number): Promise<boolean> {
    const rows = await qr.manager.query(
      `SELECT is_mandatory, status
         FROM process_instance_step_requirements
        WHERE step_instance_id = ?`,
      [stepInstanceId],
    );
    return rows.filter((r: any) => r.is_mandatory === 1).every((r: any) => r.status === 'approved');
  }

  /**
   * Evaluates all trigger instances for a step and updates their status.
   * - Calls TriggerEngineService with each trigger's JSON schema and an evaluation context.
   * - Persists `status`, `met_at`, and `last_eval_at`.
   * @returns true if *all* triggers are met.
   */
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

  /**
   * Enables (moves to `ready`) the next step(s) in a *linear* process if they are unblocked.
   * Preconditions for each next step:
   *  - status === 'pending'
   *  - all mandatory requirements approved
   *  - all triggers met
   *
   * NOTE: This function currently uses `step_order + 1`.
   *       Replace the query/logic for DAGs or fan-out/fan-in as needed.
   */
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
        this.events.emit('six1-event.step.ready', {
          entity: { entityType: 'ProcessStep', entityId: row.step_instance_id },
          data: { processInstanceId, stepOrder: row.step_order, cause: opts.cause ?? 'event' },
          correlationId: opts.correlationId,
        });
      }
    }
  }

  /**
   * Builds the trigger evaluation context.
   * Contains tenant & template identifiers, current process/step IDs,
   * and a summary flag for requirement approvals.
   *
   * Keep this payload lean/stable—changes may require updating trigger schemas.
   */
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
      now: new Date().toISOString(), // Standardize time for deterministic evaluations.
    };
  }

  /**
   * Loads a step instance row with a pessimistic lock.
   * Returns `null` if not found.
   */
  private async loadStepLocked(qr: QueryRunner, stepInstanceId: number): Promise<any | null> {
    const [row] = await qr.manager.query(
      `SELECT * FROM process_instance_steps WHERE step_instance_id = ? FOR UPDATE`,
      [stepInstanceId],
    );
    return row ?? null;
  }

  /**
   * Generic state transition helper.
   * - Only updates timestamps that are provided (via COALESCE on existing columns).
   * - Always updates `updated_at` to NOW().
   *
   * @param next - Next status to set.
   * @param times - Partial timestamps for the transition (only set the ones relevant to the new state).
   */
  private async setState(
    qr: QueryRunner,
    stepInstanceId: number,
    next: 'pending' | 'ready' | 'in_progress' | 'blocked' | 'completed' | 'canceled',
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

  // ---------- tx helpers ----------

  /**
   * Starts a new transaction-scoped QueryRunner.
   * IMPORTANT: Always pair with `release` in a `finally` block.
   */
  private async begin(): Promise<QueryRunner> {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    return qr;
  }

  /** Best-effort rollback (no throw). Use when early-returning in a tx flow. */
  private async rollback(qr: QueryRunner) { await qr.rollbackTransaction(); }

  /** Defensive rollback that swallows rollback errors to preserve original error. */
  private async safeRollback(qr: QueryRunner) { try { await qr.rollbackTransaction(); } catch {} }

  /** Always release the runner; swallow release errors to avoid masking the root cause. */
  private async release(qr: QueryRunner) { try { await qr.release(); } catch {} }
}
