import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { DataSource, QueryRunner } from 'typeorm';
import {
  NO_RECORD_FOUND_MESSAGE,
  PROCESS_INSTANCE_STEP_MISMATCH_MESSAGE,
  PROCESS_STEP_GATES_NOT_MET_MESSAGE,
  PROCESS_STEP_INVALID_STATE_MESSAGE,
  PROCESS_STEP_NOT_FOUND_MESSAGE,
} from '../common/constants';
import { ProcessInstanceEntity } from '../process_instances/entities/process_instance.entity';
import { TriggerEngineService } from './trigger-engine.service';
import { EventsService } from '../events/events.service';
import type { ProcessEngineState } from './process-engine-state';
import { ProcessHostRegistry } from './process-host/process-host.registry';
import {
  buildProcessHostContext,
  buildStepStateChangedContext,
  loadProcessInstanceRow,
} from './process-host/process-host-orchestration.util';
import { ConfigObjectStepExecutor } from './config-object-step-executor.service';
import { ChildProcessOrchestrationService } from './child-process-orchestration.service';
import { ProcessCompletionService } from './process-completion.service';
import { PROCESS_STEP_TASK_TYPE_CALL_PROCESS } from './process-step-task-type.constants';

type AdvanceOptions = {
  cause?: 'event' | 'manual' | 'timer';
  correlationId?: string;
  actorTenantUserId?: number;
  /** When true, failed preconditions throw RpcException (Runner / explicit complete API). */
  failOnPrecondition?: boolean;
  expectedProcessInstanceId?: number;
  expectedTenantId?: number;
};

type StepRow = {
  step_instance_id: number;
  process_instance_id: number;
  process_template_step_id: number;
  step_order: number;
  status: string;
  task_type: string;
};

@Injectable()
export class StepOrchestratorService {
  private readonly logger = new Logger(StepOrchestratorService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly triggers: TriggerEngineService,
    private readonly events: EventsService,
    private readonly hostRegistry: ProcessHostRegistry,
    private readonly configObjectExecutor: ConfigObjectStepExecutor,
    private readonly childProcess: ChildProcessOrchestrationService,
    private readonly processCompletion: ProcessCompletionService,
  ) {}

  /**
   * After a call_process parent step completes (child finished), unlock following steps.
   */
  async resumeParentAfterChildCallProcess(
    parentStepInstanceId: number,
    opts: AdvanceOptions = {},
  ): Promise<void> {
    const qr = await this.begin();
    let childTerminalId: number | null = null;
    try {
      const [step] = await qr.manager.query(
        `SELECT process_instance_id, step_order, status
           FROM process_instance_steps
          WHERE step_instance_id = ?
          FOR UPDATE`,
        [parentStepInstanceId],
      );
      if (!step || step.status !== 'completed') {
        return await this.rollback(qr);
      }

      await this.enableNextSteps(
        qr,
        Number(step.process_instance_id),
        Number(step.step_order),
        opts,
      );
      childTerminalId = await this.maybeCompleteJob(
        qr,
        Number(step.process_instance_id),
        opts,
      );
      await qr.commitTransaction();
    } catch (e) {
      await this.safeRollback(qr);
      throw e;
    } finally {
      await this.release(qr);
    }

    if (childTerminalId) {
      await this.finalizeChildTerminalIfNeeded(childTerminalId, opts);
    }
  }

  async attemptAdvance(stepInstanceId: number, opts: AdvanceOptions = {}) {
    const qr = await this.begin();
    let childTerminalId: number | null = null;
    try {
      const s = await this.loadStepLocked(qr, stepInstanceId);
      if (!s) return await this.rollback(qr);
      if (['completed', 'canceled', 'blocked'].includes(s.status)) {
        return await this.rollback(qr);
      }

      if (s.status === 'ready') {
        await this.configObjectExecutor.provisionBindingsOnStepReady(qr, {
          stepInstanceId: s.step_instance_id,
          correlationId: opts.correlationId,
        });
      }

      const allMandatoryApproved = await this.checkStepGates(
        qr,
        s.step_instance_id,
      );
      const triggersMet = await this.evaluateTriggers(
        qr,
        s.process_instance_id,
        s.step_instance_id,
      );

      const now = new Date();

      this.logger.debug(
        `Step ${s.step_instance_id} status=${s.status} requirements=${allMandatoryApproved} triggers=${triggersMet}`,
      );

      if (s.status === 'pending' && allMandatoryApproved && triggersMet) {
        if (
          this.childProcess.isEnabled() &&
          s.task_type === PROCESS_STEP_TASK_TYPE_CALL_PROCESS
        ) {
          await this.childProcess.spawnChildAndBlockParent(qr, s, opts);
        } else {
          await this.setState(qr, s.step_instance_id, 'ready', { ready_at: now });
          await this.dispatchStepStateChanged(qr, s, 'ready', opts);
          await this.configObjectExecutor.provisionBindingsOnStepReady(qr, {
            stepInstanceId: s.step_instance_id,
            correlationId: opts.correlationId,
          });
          this.events.emit('six1-event.process_step_ready', {
            entity: { entityType: 'ProcessStep', entityId: s.step_instance_id },
            data: {
              processInstanceId: s.process_instance_id,
              stepOrder: s.step_order,
              cause: opts.cause ?? 'event',
            },
            correlationId: opts.correlationId,
          });
        }
      }

      const fresh = await this.loadStepLocked(qr, s.step_instance_id);
      if (
        fresh &&
        fresh.task_type === 'automated' &&
        fresh.status === 'ready' &&
        allMandatoryApproved &&
        triggersMet
      ) {
        await this.setState(qr, fresh.step_instance_id, 'in_progress', {
          started_at: now,
        });
        await this.dispatchStepStateChanged(qr, fresh, 'in_progress', opts);
        this.events.emit('six1-event.process_step_started', {
          entity: {
            entityType: 'ProcessStep',
            entityId: fresh.step_instance_id,
          },
          data: {
            processInstanceId: fresh.process_instance_id,
            stepOrder: fresh.step_order,
            cause: opts.cause ?? 'event',
          },
          correlationId: opts.correlationId,
        });

        await this.setState(qr, fresh.step_instance_id, 'completed', {
          completed_at: new Date(),
        });
        await this.dispatchStepStateChanged(qr, fresh, 'completed', opts);
        this.events.emit('six1-event.process_step_completed', {
          entity: {
            entityType: 'ProcessStep',
            entityId: fresh.step_instance_id,
          },
          data: {
            processInstanceId: fresh.process_instance_id,
            stepOrder: fresh.step_order,
            cause: opts.cause ?? 'event',
          },
          correlationId: opts.correlationId,
        });

        await this.enableNextSteps(
          qr,
          fresh.process_instance_id,
          fresh.step_order,
          opts,
        );
        childTerminalId = await this.maybeCompleteJob(
          qr,
          fresh.process_instance_id,
          opts,
        );
      }

      await qr.commitTransaction();
    } catch (e) {
      await this.safeRollback(qr);
      throw e;
    } finally {
      await this.release(qr);
    }

    if (childTerminalId) {
      await this.finalizeChildTerminalIfNeeded(childTerminalId, opts);
    }
  }

  async markCompleted(stepInstanceId: number, opts: AdvanceOptions = {}) {
    const qr = await this.begin();
    let childTerminalId: number | null = null;
    try {
      const s = await this.loadStepLocked(qr, stepInstanceId);
      if (!s) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_STEP_NOT_FOUND_MESSAGE);
        }
        return await this.rollback(qr);
      }

      if (
        opts.expectedProcessInstanceId != null &&
        s.process_instance_id !== opts.expectedProcessInstanceId
      ) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_INSTANCE_STEP_MISMATCH_MESSAGE);
        }
        return await this.rollback(qr);
      }

      if (opts.expectedTenantId != null) {
        const proc = await loadProcessInstanceRow(
          qr.manager,
          s.process_instance_id,
        );
        if (!proc || proc.tenant_id !== opts.expectedTenantId) {
          if (opts.failOnPrecondition) {
            throw new RpcException(
              NO_RECORD_FOUND_MESSAGE.replaceAll(
                '{entity_name}',
                ProcessInstanceEntity.name,
              ),
            );
          }
          return await this.rollback(qr);
        }
      }

      if (!['ready', 'in_progress'].includes(s.status)) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_STEP_INVALID_STATE_MESSAGE);
        }
        return await this.rollback(qr);
      }

      if (!(await this.checkStepGates(qr, s.step_instance_id))) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_STEP_GATES_NOT_MET_MESSAGE);
        }
        return await this.rollback(qr);
      }

      await this.setState(qr, s.step_instance_id, 'completed', {
        completed_at: new Date(),
      });
      await this.dispatchStepStateChanged(qr, s, 'completed', opts);
      this.events.emit('six1-event.notification.process_step_completed', {
        entity: { entityType: 'ProcessStep', entityId: s.step_instance_id },
        data: {
          processInstanceId: s.process_instance_id,
          stepOrder: s.step_order,
          cause: opts.cause ?? 'manual',
        },
        correlationId: opts.correlationId,
      });

      await this.enableNextSteps(qr, s.process_instance_id, s.step_order, opts);
      childTerminalId = await this.maybeCompleteJob(
        qr,
        s.process_instance_id,
        opts,
      );
      await qr.commitTransaction();
    } catch (e) {
      await this.safeRollback(qr);
      throw e;
    } finally {
      await this.release(qr);
    }

    if (childTerminalId) {
      await this.finalizeChildTerminalIfNeeded(childTerminalId, opts);
    }
  }

  private async dispatchStepStateChanged(
    qr: QueryRunner,
    step: Pick<StepRow, 'process_instance_id' | 'step_instance_id' | 'step_order'>,
    engineState: ProcessEngineState,
    opts: AdvanceOptions,
  ): Promise<void> {
    const proc = await loadProcessInstanceRow(qr.manager, step.process_instance_id);
    if (!proc) {
      return;
    }

    const adapter = this.hostRegistry.get(proc.subject_type);
    const ctx = buildStepStateChangedContext(qr.manager, proc, {
      stepInstanceId: step.step_instance_id,
      engineState,
      stepOrder: step.step_order,
      advance: {
        actorTenantUserId: opts.actorTenantUserId,
        correlationId: opts.correlationId,
      },
    });
    await adapter.onStepStateChanged(ctx);
  }

  private async maybeCompleteJob(
    qr: QueryRunner,
    processInstanceId: number,
    opts: AdvanceOptions,
  ): Promise<number | null> {
    const allDone = await this.areAllStepsCompleted(qr, processInstanceId);
    if (allDone) {
      await this.childProcess.markProcessCompletedIfEligible(
        qr.manager,
        processInstanceId,
      );
    }

    const [inst] = await qr.manager.query(
      `SELECT status, parent_step_id
         FROM process_instances
        WHERE process_instance_id = ?
        LIMIT 1`,
      [processInstanceId],
    );

    if (
      allDone &&
      inst?.parent_step_id != null &&
      String(inst.status) === 'completed'
    ) {
      return processInstanceId;
    }

    const engineCanComplete = await this.processCompletion.canCompleteProcess(
      processInstanceId,
      qr.manager,
    );

    if (!engineCanComplete) {
      return null;
    }

    const proc = await loadProcessInstanceRow(qr.manager, processInstanceId);
    if (!proc) {
      return null;
    }

    const adapter = this.hostRegistry.get(proc.subject_type);
    const ctx = buildProcessHostContext(qr.manager, proc, {
      actorTenantUserId: opts.actorTenantUserId,
      correlationId: opts.correlationId,
    });

    if (await adapter.canCompleteJob(ctx)) {
      if (allDone) {
        await qr.manager.query(
          `UPDATE process_instances
              SET status = 'completed', completed_at = NOW()
            WHERE process_instance_id = ? AND status = 'active'`,
          [processInstanceId],
        );
      }
      await adapter.onProcessCompleted(ctx);
      this.events.emit('six1-event.process_completed', {
        tenantId: proc.tenant_id,
        entity: {
          entityType: 'ProcessInstance',
          entityId: processInstanceId,
        },
        data: {
          processInstanceId,
          subjectType: proc.subject_type,
          subjectId: proc.subject_id,
        },
        correlationId: opts.correlationId,
      });
    }

    return null;
  }

  private async areAllStepsCompleted(
    qr: QueryRunner,
    processInstanceId: number,
  ): Promise<boolean> {
    const [agg] = await qr.manager.query(
      `SELECT SUM(status = 'completed') AS done, COUNT(*) AS total
         FROM process_instance_steps
        WHERE process_instance_id = ?`,
      [processInstanceId],
    );
    return (
      !!agg &&
      Number(agg.done) === Number(agg.total) &&
      Number(agg.total) > 0
    );
  }

  private async finalizeChildTerminalIfNeeded(
    childProcessInstanceId: number,
    opts: AdvanceOptions,
  ): Promise<void> {
    await this.childProcess.handleChildTerminal(
      childProcessInstanceId,
      'completed',
      opts,
    );
  }

  private async checkStepGates(
    qr: QueryRunner,
    stepInstanceId: number,
  ): Promise<boolean> {
    const requirementsOk = await this.checkRequirementsOnly(
      qr,
      stepInstanceId,
    );
    const bindingsOk =
      await this.configObjectExecutor.areMandatoryBindingsValid(
        qr.manager,
        stepInstanceId,
      );
    return requirementsOk && bindingsOk;
  }

  private async checkRequirementsOnly(
    qr: QueryRunner,
    stepInstanceId: number,
  ): Promise<boolean> {
    const rows = await qr.manager.query(
      `SELECT is_mandatory, status
         FROM process_instance_step_requirements
        WHERE step_instance_id = ?`,
      [stepInstanceId],
    );
    return rows
      .filter((r: { is_mandatory: number }) => r.is_mandatory === 1)
      .every((r: { status: string }) => r.status === 'approved');
  }

  private async evaluateTriggers(
    qr: QueryRunner,
    processInstanceId: number,
    stepInstanceId: number,
  ): Promise<boolean> {
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

  private async enableNextSteps(
    qr: QueryRunner,
    processInstanceId: number,
    currentOrder: number,
    opts: AdvanceOptions,
  ) {
    const nextRows = await qr.manager.query(
      `SELECT step_instance_id,
              process_instance_id,
              process_template_step_id,
              step_order,
              status,
              task_type
         FROM process_instance_steps
        WHERE process_instance_id = ? AND step_order = ? AND status = 'pending'
        FOR UPDATE`,
      [processInstanceId, currentOrder + 1],
    );

    for (const row of nextRows) {
      const okReq = await this.checkStepGates(qr, row.step_instance_id);
      const okTrig = await this.evaluateTriggers(
        qr,
        processInstanceId,
        row.step_instance_id,
      );
      if (!okReq || !okTrig) {
        continue;
      }

      if (
        this.childProcess.isEnabled() &&
        row.task_type === PROCESS_STEP_TASK_TYPE_CALL_PROCESS
      ) {
        await this.childProcess.spawnChildAndBlockParent(
          qr,
          row as StepRow,
          opts,
        );
        continue;
      }

      await this.setState(qr, row.step_instance_id, 'ready', {
        ready_at: new Date(),
      });
      await this.dispatchStepStateChanged(
        qr,
        {
          process_instance_id: processInstanceId,
          step_instance_id: row.step_instance_id,
          step_order: row.step_order,
        },
        'ready',
        opts,
      );
      await this.configObjectExecutor.provisionBindingsOnStepReady(qr, {
        stepInstanceId: row.step_instance_id,
        correlationId: opts.correlationId,
      });
      this.events.emit('six1-event.process_step_task_created', {
        entity: { entityType: 'ProcessStep', entityId: row.step_instance_id },
        data: {
          processInstanceId,
          stepOrder: row.step_order,
          cause: opts.cause ?? 'event',
        },
        correlationId: opts.correlationId,
      });
    }
  }

  private async buildContext(
    qr: QueryRunner,
    processInstanceId: number,
    stepInstanceId: number,
  ) {
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
    const allReqApproved = reqRows
      .filter((r: { is_mandatory: number }) => r.is_mandatory === 1)
      .every((r: { status: string }) => r.status === 'approved');

    return {
      tenantId: proc?.tenant_id,
      processTemplateId: proc?.process_template_id,
      processInstanceId,
      step: {
        id: stepInstanceId,
        allRequiredSubmissionsApproved: allReqApproved,
      },
      now: new Date().toISOString(),
    };
  }

  private async loadStepLocked(
    qr: QueryRunner,
    stepInstanceId: number,
  ): Promise<StepRow | null> {
    const [row] = await qr.manager.query(
      `SELECT * FROM process_instance_steps WHERE step_instance_id = ? FOR UPDATE`,
      [stepInstanceId],
    );
    return (row as StepRow | undefined) ?? null;
  }

  private async setState(
    qr: QueryRunner,
    stepInstanceId: number,
    next: ProcessEngineState,
    times: Partial<{
      ready_at: Date;
      started_at: Date;
      completed_at: Date;
      canceled_at: Date;
    }> = {},
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
      [
        next,
        times.ready_at ?? null,
        times.started_at ?? null,
        times.completed_at ?? null,
        times.canceled_at ?? null,
        stepInstanceId,
      ],
    );
  }

  private async begin(): Promise<QueryRunner> {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    return qr;
  }

  private async rollback(qr: QueryRunner) {
    await qr.rollbackTransaction();
  }

  private async safeRollback(qr: QueryRunner) {
    try {
      await qr.rollbackTransaction();
    } catch {
      /* ignore */
    }
  }

  private async release(qr: QueryRunner) {
    try {
      await qr.release();
    } catch {
      /* ignore */
    }
  }
}
