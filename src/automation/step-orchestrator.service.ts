import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { DataSource, QueryRunner } from 'typeorm';
import {
  NO_RECORD_FOUND_MESSAGE,
  PROCESS_INSTANCE_STEP_MISMATCH_MESSAGE,
  PROCESS_STEP_GATES_NOT_MET_MESSAGE,
  PROCESS_STEP_INVALID_STATE_MESSAGE,
  PROCESS_STEP_INVALID_STATE_SKIP_MESSAGE,
  PROCESS_STEP_NOT_FOUND_MESSAGE,
  PROCESS_STEP_SKIP_NOT_ALLOWED_MESSAGE,
} from '../common/constants';
import { ProcessInstanceEntity } from '../process_instances/entities/process_instance.entity';
import { TriggerEngineService } from './trigger-engine.service';
import { EventsService } from '../events/events.service';
import { PLATFORM_EVENT_NAMES } from '../events/constants/platform-event-names.constants';
import {
  buildProcessInstanceEventOptions,
  buildProcessStepEventOptions,
} from '../events/platform-process-event.util';
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
import { ProcessStepActionOrchestrationService } from './process-step-action-orchestration.service';
import { ProcessStepExecutionLogService } from './process-step-execution-log.service';
import { ProcessStepAssigneeService } from './process-step-assignee.service';
import { ProcessStepExtensionEvaluatorService } from './process-step-extension-evaluator.service';
import type { ProcessStepExtensionBindingSummary } from './process-step-extension-evaluator.types';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import { coercePositiveInt } from './process-step-action-envelope.util';

type AdvanceOptions = {
  cause?: 'event' | 'manual' | 'timer' | 'system';
  correlationId?: string;
  actorTenantUserId?: number;
  /** When true, failed preconditions throw RpcException (Runner / explicit complete API). */
  failOnPrecondition?: boolean;
  expectedProcessInstanceId?: number;
  expectedTenantId?: number;
  executionLogMetadata?: Record<string, unknown> | null;
};

type StepRow = {
  step_instance_id: number;
  process_instance_id: number;
  process_template_step_id: number;
  step_order: number;
  status: string;
  task_type: string;
  name?: string | null;
  is_optional?: number;
  parallel_group_id?: string | null;
  step_extensions_json?: unknown;
};

type StepFailureDetails = {
  errorCode?: string;
  errorDetail?: string;
};

type MaybeCompleteJobResult = {
  childTerminalProcessInstanceId: number | null;
  processCompletedInstanceId: number | null;
};

type PostCommitLifecycleWork = {
  opts: AdvanceOptions;
  stepCompletedInstanceIds?: number[];
  childTerminalProcessInstanceId?: number | null;
  processCompletedInstanceId?: number | null;
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
    private readonly stepActions: ProcessStepActionOrchestrationService,
    private readonly stepExecutionLog: ProcessStepExecutionLogService,
    private readonly stepAssignees: ProcessStepAssigneeService,
    private readonly stepExtensionEvaluator: ProcessStepExtensionEvaluatorService,
    private readonly processFlags: ProcessFeatureFlagsService,
  ) {}

  /**
   * After a call_process parent step completes (child finished), unlock following steps.
   */
  async resumeParentAfterChildCallProcess(
    parentStepInstanceId: number,
    opts: AdvanceOptions = {},
  ): Promise<void> {
    const qr = await this.begin();
    let postCommit: PostCommitLifecycleWork = { opts };
    try {
      const [step] = await qr.manager.query(
        `SELECT process_instance_id, step_order, status
           FROM process_instance_steps
          WHERE step_instance_id = ?
          FOR UPDATE`,
        [parentStepInstanceId],
      );
      if (!step || step.status !== 'completed') {
        return await this.rollbackTx(qr);
      }

      await this.enableNextSteps(
        qr,
        Number(step.process_instance_id),
        Number(step.step_order),
        opts,
      );
      postCommit = {
        opts,
        ...(await this.maybeCompleteJob(
          qr,
          Number(step.process_instance_id),
          opts,
        )),
      };
      await qr.commitTransaction();
    } catch (e) {
      await this.safeRollback(qr);
      throw e;
    } finally {
      await this.release(qr);
    }

    await this.runPostCommitLifecycleActions(postCommit);
  }

  async attemptAdvance(stepInstanceId: number, opts: AdvanceOptions = {}) {
    const qr = await this.begin();
    let postCommit: PostCommitLifecycleWork = { opts };
    try {
      let s = await this.loadStepLocked(qr, stepInstanceId);
      if (!s) return await this.rollbackTx(qr);

      const procMeta = await this.resolveProcessEventMeta(
        qr,
        s.process_instance_id,
      );
      const resolvedOpts: AdvanceOptions = {
        ...opts,
        correlationId: opts.correlationId ?? procMeta.correlationId,
      };
      const proc = await loadProcessInstanceRow(qr.manager, s.process_instance_id);

      await this.reconcileSkippedSteps(qr, s.process_instance_id, proc, resolvedOpts);

      s = (await this.loadStepLocked(qr, stepInstanceId)) ?? s;
      if (['completed', 'canceled', 'blocked', 'skipped'].includes(s.status)) {
        return await this.rollbackTx(qr);
      }

      if (s.status === 'ready') {
        await this.configObjectExecutor.provisionBindingsOnStepReady(qr, {
          stepInstanceId: s.step_instance_id,
          correlationId: resolvedOpts.correlationId,
        });
      }

      const requirementsMet = await this.checkRequirementsOnly(
        qr,
        s.step_instance_id,
      );
      const triggersMet = await this.evaluateTriggers(
        qr,
        s.process_instance_id,
        s.step_instance_id,
      );
      const allMandatoryApproved =
        s.status === 'pending'
          ? requirementsMet
          : await this.checkStepGates(qr, s.step_instance_id);

      const now = new Date();

      this.logger.debug(
        `Step ${s.step_instance_id} status=${s.status} requirements=${allMandatoryApproved} triggers=${triggersMet}`,
      );

      if (s.status === 'pending' && requirementsMet && triggersMet) {
        await this.activateEligiblePendingStep(
          qr,
          s,
          proc,
          procMeta,
          resolvedOpts,
          now,
          false,
          postCommit,
        );
      }

      const fresh = await this.loadStepLocked(qr, s.step_instance_id);
      if (
        fresh &&
        fresh.task_type === 'automated' &&
        fresh.status === 'ready' &&
        allMandatoryApproved &&
        triggersMet
      ) {
        await this.transitionStep(
          qr,
          fresh,
          'ready',
          'in_progress',
          { started_at: now },
          resolvedOpts,
          procMeta.tenantId ?? 0,
        );
        await this.dispatchStepStateChanged(qr, fresh, 'in_progress', resolvedOpts);
        this.events.emit(
          PLATFORM_EVENT_NAMES.PROCESS_STEP_STARTED,
          buildProcessStepEventOptions({
            ...procMeta,
            stepInstanceId: fresh.step_instance_id,
            processInstanceId: fresh.process_instance_id,
            stepOrder: fresh.step_order,
            correlationId: resolvedOpts.correlationId,
            cause: resolvedOpts.cause,
            actorTenantUserId: resolvedOpts.actorTenantUserId,
          }),
        );

        const completedAt = new Date();
        await this.transitionStep(
          qr,
          fresh,
          'in_progress',
          'completed',
          { completed_at: completedAt },
          resolvedOpts,
          procMeta.tenantId ?? 0,
        );
        await this.dispatchStepStateChanged(qr, fresh, 'completed', resolvedOpts);
        this.events.emit(
          PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED,
          buildProcessStepEventOptions({
            ...procMeta,
            stepInstanceId: fresh.step_instance_id,
            processInstanceId: fresh.process_instance_id,
            stepOrder: fresh.step_order,
            correlationId: resolvedOpts.correlationId,
            cause: resolvedOpts.cause,
            actorTenantUserId: resolvedOpts.actorTenantUserId,
          }),
        );

        await this.enableNextSteps(
          qr,
          fresh.process_instance_id,
          fresh.step_order,
          resolvedOpts,
          postCommit,
        );
        postCommit = {
          opts: resolvedOpts,
          stepCompletedInstanceIds: [
            ...(postCommit.stepCompletedInstanceIds ?? []),
            fresh.step_instance_id,
          ],
          ...(await this.maybeCompleteJob(
            qr,
            fresh.process_instance_id,
            resolvedOpts,
          )),
        };
      }

      await qr.commitTransaction();
    } catch (e) {
      await this.safeRollback(qr);
      throw e;
    } finally {
      await this.release(qr);
    }

    await this.runPostCommitLifecycleActions(postCommit);
  }

  /**
   * Manually skips a step (F4): `allowSkip` extension or `is_optional`, bindings → skipped, then advance.
   */
  async markSkipped(stepInstanceId: number, opts: AdvanceOptions = {}) {
    const qr = await this.begin();
    let postCommit: PostCommitLifecycleWork = { opts };
    try {
      const s = await this.loadStepLocked(qr, stepInstanceId);
      if (!s) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_STEP_NOT_FOUND_MESSAGE);
        }
        return await this.rollbackTx(qr);
      }

      if (
        opts.expectedProcessInstanceId != null &&
        s.process_instance_id !== opts.expectedProcessInstanceId
      ) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_INSTANCE_STEP_MISMATCH_MESSAGE);
        }
        return await this.rollbackTx(qr);
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
          return await this.rollbackTx(qr);
        }
      }

      if (!['ready', 'in_progress'].includes(s.status)) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_STEP_INVALID_STATE_SKIP_MESSAGE);
        }
        return await this.rollbackTx(qr);
      }

      if (!this.isManualSkipAllowed(s)) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_STEP_SKIP_NOT_ALLOWED_MESSAGE);
        }
        return await this.rollbackTx(qr);
      }

      const procMeta = await this.resolveProcessEventMeta(
        qr,
        s.process_instance_id,
      );
      const resolvedOpts: AdvanceOptions = {
        ...opts,
        correlationId: opts.correlationId ?? procMeta.correlationId,
        cause: opts.cause ?? 'manual',
        executionLogMetadata: {
          action: 'skipped',
          ...(opts.executionLogMetadata ?? {}),
        },
      };

      await this.configObjectExecutor.skipBindingsForStep(
        qr.manager,
        s.step_instance_id,
      );

      await this.transitionStep(
        qr,
        s,
        s.status,
        'skipped',
        {},
        resolvedOpts,
        procMeta.tenantId ?? 0,
      );
      await this.dispatchStepStateChanged(qr, s, 'skipped', resolvedOpts);

      await this.enableNextSteps(
        qr,
        s.process_instance_id,
        s.step_order,
        resolvedOpts,
      );
      postCommit = {
        opts: resolvedOpts,
        ...(await this.maybeCompleteJob(
          qr,
          s.process_instance_id,
          resolvedOpts,
        )),
      };
      await qr.commitTransaction();
    } catch (e) {
      await this.safeRollback(qr);
      throw e;
    } finally {
      await this.release(qr);
    }

    await this.runPostCommitLifecycleActions(postCommit);
  }

  async markCompleted(stepInstanceId: number, opts: AdvanceOptions = {}) {
    const qr = await this.begin();
    let postCommit: PostCommitLifecycleWork = { opts };
    try {
      const s = await this.loadStepLocked(qr, stepInstanceId);
      if (!s) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_STEP_NOT_FOUND_MESSAGE);
        }
        return await this.rollbackTx(qr);
      }

      if (
        opts.expectedProcessInstanceId != null &&
        s.process_instance_id !== opts.expectedProcessInstanceId
      ) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_INSTANCE_STEP_MISMATCH_MESSAGE);
        }
        return await this.rollbackTx(qr);
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
          return await this.rollbackTx(qr);
        }
      }

      if (!['ready', 'in_progress'].includes(s.status)) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_STEP_INVALID_STATE_MESSAGE);
        }
        return await this.rollbackTx(qr);
      }

      if (!(await this.checkStepGates(qr, s.step_instance_id))) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_STEP_GATES_NOT_MET_MESSAGE);
        }
        return await this.rollbackTx(qr);
      }

      const procMeta = await this.resolveProcessEventMeta(
        qr,
        s.process_instance_id,
      );
      const resolvedOpts: AdvanceOptions = {
        ...opts,
        correlationId: opts.correlationId ?? procMeta.correlationId,
      };

      await this.transitionStep(
        qr,
        s,
        s.status,
        'completed',
        { completed_at: new Date() },
        resolvedOpts,
        procMeta.tenantId ?? 0,
      );
      await this.dispatchStepStateChanged(qr, s, 'completed', resolvedOpts);
      this.events.emit(
        PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED,
        buildProcessStepEventOptions({
          ...procMeta,
          stepInstanceId: s.step_instance_id,
          processInstanceId: s.process_instance_id,
          stepOrder: s.step_order,
          correlationId: resolvedOpts.correlationId,
          cause: resolvedOpts.cause ?? 'manual',
          actorTenantUserId: resolvedOpts.actorTenantUserId,
        }),
      );

      await this.enableNextSteps(
        qr,
        s.process_instance_id,
        s.step_order,
        resolvedOpts,
        postCommit,
      );
      postCommit = {
        opts: resolvedOpts,
        stepCompletedInstanceIds: [
          ...(postCommit.stepCompletedInstanceIds ?? []),
          s.step_instance_id,
        ],
        ...(await this.maybeCompleteJob(
          qr,
          s.process_instance_id,
          resolvedOpts,
        )),
      };
      await qr.commitTransaction();
    } catch (e) {
      await this.safeRollback(qr);
      throw e;
    } finally {
      await this.release(qr);
    }

    await this.runPostCommitLifecycleActions(postCommit);
  }

  /**
   * Marks a step failed (F6). Intended for internal wiring (webhooks / executors).
   * Retry resets `failed` → `ready` via {@link retry}.
   */
  async markFailed(
    stepInstanceId: number,
    failure: StepFailureDetails,
    opts: AdvanceOptions = {},
  ): Promise<void> {
    const qr = await this.begin();
    try {
      const s = await this.loadStepLocked(qr, stepInstanceId);
      if (!s) return await this.rollbackTx(qr);
      if (!['ready', 'in_progress'].includes(String(s.status))) {
        return await this.rollbackTx(qr);
      }

      const procMeta = await this.resolveProcessEventMeta(qr, s.process_instance_id);
      const resolvedOpts: AdvanceOptions = {
        ...opts,
        correlationId: opts.correlationId ?? procMeta.correlationId,
        cause: opts.cause ?? 'system',
        executionLogMetadata: {
          action: 'failed',
          ...(failure.errorCode ? { errorCode: failure.errorCode } : {}),
          ...(failure.errorDetail ? { errorDetail: failure.errorDetail } : {}),
          ...(opts.executionLogMetadata ?? {}),
        },
      };

      await this.transitionStep(
        qr,
        s,
        String(s.status),
        'failed',
        {},
        resolvedOpts,
        procMeta.tenantId ?? 0,
      );
      await this.dispatchStepStateChanged(qr, s, 'failed', resolvedOpts);

      // Explicitly record failure event (even though failed maps to step_failed too).
      await this.stepExecutionLog.recordCustomEvent(qr, {
        processInstanceId: s.process_instance_id,
        stepInstanceId: s.step_instance_id,
        tenantId: procMeta.tenantId ?? 0,
        stepOrder: s.step_order,
        stepName: s.name ?? null,
        previousStatus: String(s.status),
        newStatus: 'failed',
        event: 'step_failed',
        cause: resolvedOpts.cause,
        actorTenantUserId: resolvedOpts.actorTenantUserId,
        correlationId: resolvedOpts.correlationId,
        metadata: resolvedOpts.executionLogMetadata ?? null,
      });

      await qr.commitTransaction();
    } catch (e) {
      await this.safeRollback(qr);
      throw e;
    } finally {
      await this.release(qr);
    }
  }

  /**
   * Retries a failed step (F6.2): `failed` → `ready` and re-provisions bindings.
   */
  async retry(stepInstanceId: number, opts: AdvanceOptions = {}): Promise<void> {
    const qr = await this.begin();
    let postCommit: PostCommitLifecycleWork = { opts };
    try {
      const s = await this.loadStepLocked(qr, stepInstanceId);
      if (!s) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_STEP_NOT_FOUND_MESSAGE);
        }
        return await this.rollbackTx(qr);
      }
      if (opts.expectedProcessInstanceId != null && s.process_instance_id !== opts.expectedProcessInstanceId) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_INSTANCE_STEP_MISMATCH_MESSAGE);
        }
        return await this.rollbackTx(qr);
      }
      if (opts.expectedTenantId != null) {
        const proc = await loadProcessInstanceRow(qr.manager, s.process_instance_id);
        if (!proc || proc.tenant_id !== opts.expectedTenantId) {
          if (opts.failOnPrecondition) {
            throw new RpcException(
              NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', ProcessInstanceEntity.name),
            );
          }
          return await this.rollbackTx(qr);
        }
      }

      if (String(s.status) !== 'failed') {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_STEP_INVALID_STATE_SKIP_MESSAGE);
        }
        return await this.rollbackTx(qr);
      }

      const procMeta = await this.resolveProcessEventMeta(qr, s.process_instance_id);
      const resolvedOpts: AdvanceOptions = {
        ...opts,
        correlationId: opts.correlationId ?? procMeta.correlationId,
        cause: opts.cause ?? 'manual',
        executionLogMetadata: {
          action: 'retry',
          ...(opts.executionLogMetadata ?? {}),
        },
      };

      await qr.manager.query(
        `UPDATE process_instance_steps
            SET status = 'ready',
                blocked_reason = NULL,
                ready_at = NOW(),
                started_at = NULL,
                completed_at = NULL,
                canceled_at = NULL,
                updated_at = NOW()
          WHERE step_instance_id = ?`,
        [s.step_instance_id],
      );

      await this.stepExecutionLog.recordCustomEvent(qr, {
        processInstanceId: s.process_instance_id,
        stepInstanceId: s.step_instance_id,
        tenantId: procMeta.tenantId ?? 0,
        stepOrder: s.step_order,
        stepName: s.name ?? null,
        previousStatus: 'failed',
        newStatus: 'ready',
        event: 'step_retry',
        cause: resolvedOpts.cause,
        actorTenantUserId: resolvedOpts.actorTenantUserId,
        correlationId: resolvedOpts.correlationId,
        metadata: resolvedOpts.executionLogMetadata ?? null,
      });

      await this.configObjectExecutor.provisionBindingsOnStepReady(qr, {
        stepInstanceId: s.step_instance_id,
        correlationId: resolvedOpts.correlationId,
      });

      const proc = await loadProcessInstanceRow(qr.manager, s.process_instance_id);
      await this.activateEligiblePendingStep(
        qr,
        { ...s, status: 'pending' },
        proc,
        procMeta,
        resolvedOpts,
        new Date(),
        false,
        postCommit,
      );

      postCommit = {
        opts: resolvedOpts,
        ...(await this.maybeCompleteJob(qr, s.process_instance_id, resolvedOpts)),
      };
      await qr.commitTransaction();
    } catch (e) {
      await this.safeRollback(qr);
      throw e;
    } finally {
      await this.release(qr);
    }

    await this.runPostCommitLifecycleActions(postCommit);
  }

  /**
   * Rollback (F6.3): resets this step and downstream steps to `pending` (keeps object bindings).
   */
  async rollback(stepInstanceId: number, opts: AdvanceOptions = {}): Promise<void> {
    const qr = await this.begin();
    try {
      const s = await this.loadStepLocked(qr, stepInstanceId);
      if (!s) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_STEP_NOT_FOUND_MESSAGE);
        }
        return await this.rollbackTx(qr);
      }
      if (opts.expectedProcessInstanceId != null && s.process_instance_id !== opts.expectedProcessInstanceId) {
        if (opts.failOnPrecondition) {
          throw new RpcException(PROCESS_INSTANCE_STEP_MISMATCH_MESSAGE);
        }
        return await this.rollbackTx(qr);
      }
      if (opts.expectedTenantId != null) {
        const proc = await loadProcessInstanceRow(qr.manager, s.process_instance_id);
        if (!proc || proc.tenant_id !== opts.expectedTenantId) {
          if (opts.failOnPrecondition) {
            throw new RpcException(
              NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', ProcessInstanceEntity.name),
            );
          }
          return await this.rollbackTx(qr);
        }
      }

      const procMeta = await this.resolveProcessEventMeta(qr, s.process_instance_id);
      const resolvedOpts: AdvanceOptions = {
        ...opts,
        correlationId: opts.correlationId ?? procMeta.correlationId,
        cause: opts.cause ?? 'manual',
        executionLogMetadata: { action: 'rollback', ...(opts.executionLogMetadata ?? {}) },
      };

      await qr.manager.query(
        `UPDATE process_instance_steps
            SET status = 'pending',
                blocked_reason = NULL,
                ready_at = NULL,
                started_at = NULL,
                completed_at = NULL,
                canceled_at = NULL,
                updated_at = NOW()
          WHERE process_instance_id = ?
            AND step_order >= ?`,
        [s.process_instance_id, s.step_order],
      );

      await this.stepExecutionLog.recordCustomEvent(qr, {
        processInstanceId: s.process_instance_id,
        stepInstanceId: s.step_instance_id,
        tenantId: procMeta.tenantId ?? 0,
        stepOrder: s.step_order,
        stepName: s.name ?? null,
        previousStatus: String(s.status),
        newStatus: 'pending',
        event: 'step_rollback',
        cause: resolvedOpts.cause,
        actorTenantUserId: resolvedOpts.actorTenantUserId,
        correlationId: resolvedOpts.correlationId,
        metadata: resolvedOpts.executionLogMetadata ?? null,
      });

      await qr.commitTransaction();
    } catch (e) {
      await this.safeRollback(qr);
      throw e;
    } finally {
      await this.release(qr);
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

    if (engineState === 'completed') {
      await this.configObjectExecutor.syncProcessContextAfterStepCompleted(
        qr.manager,
        step.step_instance_id,
        step.process_instance_id,
      );
    }
  }

  private async maybeCompleteJob(
    qr: QueryRunner,
    processInstanceId: number,
    opts: AdvanceOptions,
  ): Promise<MaybeCompleteJobResult> {
    const none: MaybeCompleteJobResult = {
      childTerminalProcessInstanceId: null,
      processCompletedInstanceId: null,
    };

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
      return {
        childTerminalProcessInstanceId: processInstanceId,
        processCompletedInstanceId: null,
      };
    }

    const engineCanComplete = await this.processCompletion.canCompleteProcess(
      processInstanceId,
      qr.manager,
    );

    if (!engineCanComplete) {
      return none;
    }

    const proc = await loadProcessInstanceRow(qr.manager, processInstanceId);
    if (!proc) {
      return none;
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
      this.events.emit(
        PLATFORM_EVENT_NAMES.PROCESS_COMPLETED,
        buildProcessInstanceEventOptions({
          tenantId: proc.tenant_id,
          processInstanceId,
          processTemplateId: proc.process_template_id,
          correlationId: opts.correlationId,
          subjectType: proc.subject_type,
          subjectId: proc.subject_id,
          actorTenantUserId: opts.actorTenantUserId,
        }),
      );
      return {
        childTerminalProcessInstanceId: null,
        processCompletedInstanceId: processInstanceId,
      };
    }

    return none;
  }

  private async runPostCommitLifecycleActions(
    work: PostCommitLifecycleWork,
  ): Promise<void> {
    const actionOpts = {
      correlationId: work.opts.correlationId,
      actorUserId: work.opts.actorTenantUserId,
    };

    for (const stepId of work.stepCompletedInstanceIds ?? []) {
      await this.stepActions.runStepCompleted(stepId, actionOpts);
    }

    if (work.childTerminalProcessInstanceId) {
      await this.finalizeChildTerminalIfNeeded(
        work.childTerminalProcessInstanceId,
        work.opts,
      );
    }

    if (work.processCompletedInstanceId) {
      await this.stepActions.runProcessCompleted(
        work.processCompletedInstanceId,
        actionOpts,
      );
    }
  }

  private async areAllStepsCompleted(
    qr: QueryRunner,
    processInstanceId: number,
  ): Promise<boolean> {
    const [agg] = await qr.manager.query(
      `SELECT SUM(status IN ('completed', 'skipped')) AS done, COUNT(*) AS total
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
    postCommit?: PostCommitLifecycleWork,
  ) {
    const procMeta = await this.resolveProcessEventMeta(qr, processInstanceId);
    const proc = await loadProcessInstanceRow(qr.manager, processInstanceId);

    // G1 — parallel groups: if the current order is part of a group, unlock peers
    // in the same order first and enforce a completion barrier before advancing.
    const currentGroupId = await this.resolveParallelGroupForOrder(
      qr,
      processInstanceId,
      currentOrder,
    );
    if (currentGroupId) {
      await this.enablePendingStepsAtOrder(
        qr,
        processInstanceId,
        currentOrder,
        currentGroupId,
        proc,
        procMeta,
        opts,
        postCommit,
      );

      const barrierPassed = await this.isParallelGroupBarrierSatisfied(qr, {
        processInstanceId,
        stepOrder: currentOrder,
        parallelGroupId: currentGroupId,
      });
      if (!barrierPassed) {
        return;
      }
    }

    const nextRows = await qr.manager.query(
      `SELECT step_instance_id,
              process_instance_id,
              process_template_step_id,
              step_order,
              status,
              task_type,
              name,
              is_optional,
              parallel_group_id,
              step_extensions_json
         FROM process_instance_steps
        WHERE process_instance_id = ? AND step_order = ? AND status = 'pending'
        FOR UPDATE`,
      [processInstanceId, currentOrder + 1],
    );

    for (const row of nextRows) {
      const okReq = await this.checkRequirementsOnly(qr, row.step_instance_id);
      const okTrig = await this.evaluateTriggers(
        qr,
        processInstanceId,
        row.step_instance_id,
      );
      if (!okReq || !okTrig) {
        continue;
      }

      await this.activateEligiblePendingStep(
        qr,
        row as StepRow,
        proc,
        procMeta,
        opts,
        new Date(),
        true,
        postCommit,
      );
    }
  }

  private async enablePendingStepsAtOrder(
    qr: QueryRunner,
    processInstanceId: number,
    stepOrder: number,
    parallelGroupId: string,
    proc: {
      subject_type: string;
      subject_id: number;
      subject_metadata: Record<string, unknown> | null;
      context: Record<string, unknown> | null;
    } | null,
    procMeta: {
      tenantId?: number;
      processTemplateId?: number;
      correlationId?: string;
      customerCoreId?: number;
    },
    opts: AdvanceOptions,
    postCommit?: PostCommitLifecycleWork,
  ): Promise<void> {
    const rows = await qr.manager.query(
      `SELECT step_instance_id,
              process_instance_id,
              process_template_step_id,
              step_order,
              status,
              task_type,
              name,
              is_optional,
              parallel_group_id,
              step_extensions_json
         FROM process_instance_steps
        WHERE process_instance_id = ?
          AND step_order = ?
          AND status = 'pending'
          AND parallel_group_id = ?
        FOR UPDATE`,
      [processInstanceId, stepOrder, parallelGroupId],
    );

    for (const row of rows) {
      const okReq = await this.checkRequirementsOnly(qr, row.step_instance_id);
      const okTrig = await this.evaluateTriggers(
        qr,
        processInstanceId,
        row.step_instance_id,
      );
      if (!okReq || !okTrig) {
        continue;
      }
      await this.activateEligiblePendingStep(
        qr,
        row as StepRow,
        proc,
        procMeta,
        opts,
        new Date(),
        true,
        postCommit,
      );
    }
  }

  private async resolveParallelGroupForOrder(
    qr: QueryRunner,
    processInstanceId: number,
    stepOrder: number,
  ): Promise<string | null> {
    const [row] = await qr.manager.query(
      `SELECT parallel_group_id
         FROM process_instance_steps
        WHERE process_instance_id = ?
          AND step_order = ?
          AND parallel_group_id IS NOT NULL
        ORDER BY step_instance_id ASC
        LIMIT 1`,
      [processInstanceId, stepOrder],
    );
    const value = row?.parallel_group_id != null ? String(row.parallel_group_id) : '';
    return value.trim().length ? value.trim() : null;
  }

  private async isParallelGroupBarrierSatisfied(
    qr: QueryRunner,
    params: {
      processInstanceId: number;
      stepOrder: number;
      parallelGroupId: string;
    },
  ): Promise<boolean> {
    // Barrier rule (G1.2): all mandatory (is_optional = 0) steps in the group
    // must be terminal before enabling the next order.
    const [agg] = await qr.manager.query(
      `SELECT COUNT(*) AS blocking
         FROM process_instance_steps
        WHERE process_instance_id = ?
          AND step_order = ?
          AND parallel_group_id = ?
          AND is_optional = 0
          AND status NOT IN ('completed', 'skipped', 'canceled')`,
      [params.processInstanceId, params.stepOrder, params.parallelGroupId],
    );
    return Number(agg?.blocking ?? 0) === 0;
  }

  /**
   * Activates a gated `pending` step, or defers it as `skipped` when `visibleWhen` is false.
   */
  private async activateEligiblePendingStep(
    qr: QueryRunner,
    step: StepRow,
    proc: {
      subject_type: string;
      subject_id: number;
      subject_metadata: Record<string, unknown> | null;
      context: Record<string, unknown> | null;
    } | null,
    procMeta: {
      tenantId?: number;
      processTemplateId?: number;
      correlationId?: string;
      customerCoreId?: number;
    },
    opts: AdvanceOptions,
    readyAt: Date = new Date(),
    emitTaskCreated = false,
    postCommit?: PostCommitLifecycleWork,
  ): Promise<void> {
    const isVisible = await this.isStepVisible(qr, proc, step);
    if (!isVisible) {
      if (step.status !== 'skipped') {
        await this.skipHiddenStep(qr, procMeta.tenantId ?? 0, step, opts);
      }
      return;
    }

    if (
      this.childProcess.isEnabled() &&
      step.task_type === PROCESS_STEP_TASK_TYPE_CALL_PROCESS
    ) {
      await this.childProcess.spawnChildAndBlockParent(qr, step, opts);
      return;
    }

    await this.transitionStep(
      qr,
      step,
      step.status,
      'ready',
      { ready_at: readyAt },
      opts,
      procMeta.tenantId ?? 0,
    );
    await this.dispatchStepStateChanged(qr, step, 'ready', opts);
    await this.configObjectExecutor.provisionBindingsOnStepReady(qr, {
      stepInstanceId: step.step_instance_id,
      correlationId: opts.correlationId,
    });
    if (this.processFlags.isStepAssigneeSpecEnabled()) {
      await this.stepAssignees.resolveAndPersistForStep(
        {
          stepInstanceId: step.step_instance_id,
          tenantId: procMeta.tenantId ?? 0,
          actorTenantUserId: opts.actorTenantUserId,
        },
        qr.manager,
      );
    }
    this.events.emit(
      PLATFORM_EVENT_NAMES.PROCESS_STEP_READY,
      await this.buildProcessStepReadyEventOptions(qr, step, procMeta, opts),
    );

    if (emitTaskCreated) {
      this.events.emit(
        PLATFORM_EVENT_NAMES.PROCESS_STEP_TASK_CREATED,
        buildProcessStepEventOptions({
          ...procMeta,
          stepInstanceId: step.step_instance_id,
          processInstanceId: step.process_instance_id,
          stepOrder: step.step_order,
          correlationId: opts.correlationId,
          cause: opts.cause,
          actorTenantUserId: opts.actorTenantUserId,
        }),
      );
    }

      // F5: Auto-advance ready steps when rule passes (manual/config_object).
      if (await this.isAutoAdvanceEligible(qr, proc, { ...step, status: 'ready' })) {
        await this.transitionStep(
          qr,
          step,
          'ready',
          'completed',
          { completed_at: new Date() },
          {
            ...opts,
            cause: 'system',
            executionLogMetadata: {
              action: 'auto_advance',
              ...(opts.executionLogMetadata ?? {}),
            },
          },
          procMeta.tenantId ?? 0,
        );
        await this.dispatchStepStateChanged(qr, step, 'completed', opts);
        this.events.emit(
          PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED,
          buildProcessStepEventOptions({
            ...procMeta,
            stepInstanceId: step.step_instance_id,
            processInstanceId: step.process_instance_id,
            stepOrder: step.step_order,
            correlationId: opts.correlationId,
            cause: 'system',
            actorTenantUserId: opts.actorTenantUserId,
          }),
        );

        if (postCommit) {
          postCommit.stepCompletedInstanceIds = [
            ...(postCommit.stepCompletedInstanceIds ?? []),
            step.step_instance_id,
          ];
        }

        await this.enableNextSteps(
          qr,
          Number(step.process_instance_id),
          Number(step.step_order),
          opts,
          postCommit,
        );
      }
  }

  /**
   * Re-evaluates deferred `skipped` steps when context changes (F3.2).
   */
  private async reconcileSkippedSteps(
    qr: QueryRunner,
    processInstanceId: number,
    proc: {
      subject_type: string;
      subject_id: number;
      subject_metadata: Record<string, unknown> | null;
      context: Record<string, unknown> | null;
    } | null,
    opts: AdvanceOptions,
  ): Promise<void> {
    if (!this.stepExtensionEvaluator.isEnabled()) {
      return;
    }

    const procMeta = await this.resolveProcessEventMeta(qr, processInstanceId);
    const skippedRows = await qr.manager.query(
      `SELECT step_instance_id,
              process_instance_id,
              process_template_step_id,
              step_order,
              status,
              task_type,
              name,
              is_optional,
              step_extensions_json
         FROM process_instance_steps
        WHERE process_instance_id = ? AND status = 'skipped'
        ORDER BY step_order ASC, step_instance_id ASC
        FOR UPDATE`,
      [processInstanceId],
    );

    for (const row of skippedRows) {
      const step = row as StepRow;
      if (!(await this.isStepVisible(qr, proc, step))) {
        continue;
      }
      if (!(await this.canReactivateSkippedStep(qr, processInstanceId, step))) {
        continue;
      }

      await this.transitionStep(
        qr,
        step,
        'skipped',
        'pending',
        {},
        { ...opts, cause: opts.cause ?? 'system' },
        procMeta.tenantId ?? 0,
      );

      const gatesMet = await this.checkStepGates(qr, step.step_instance_id);
      const triggersMet = await this.evaluateTriggers(
        qr,
        processInstanceId,
        step.step_instance_id,
      );
      if (gatesMet && triggersMet) {
        await this.activateEligiblePendingStep(
          qr,
          { ...step, status: 'pending' },
          proc,
          procMeta,
          opts,
        );
      }
    }
  }

  private async canReactivateSkippedStep(
    qr: QueryRunner,
    processInstanceId: number,
    step: StepRow,
  ): Promise<boolean> {
    const stepOrder = Number(step.step_order);

    const [priorIncomplete] = await qr.manager.query(
      `SELECT COUNT(*) AS cnt
         FROM process_instance_steps
        WHERE process_instance_id = ?
          AND step_order < ?
          AND status NOT IN ('completed', 'canceled', 'skipped')`,
      [processInstanceId, stepOrder],
    );
    if (Number(priorIncomplete?.cnt ?? 0) > 0) {
      return false;
    }

    const [downstreamActivated] = await qr.manager.query(
      `SELECT COUNT(*) AS cnt
         FROM process_instance_steps
        WHERE process_instance_id = ?
          AND step_order > ?
          AND status IN ('ready', 'in_progress', 'blocked', 'completed', 'canceled')`,
      [processInstanceId, stepOrder],
    );
    return Number(downstreamActivated?.cnt ?? 0) === 0;
  }

  private isManualSkipAllowed(step: StepRow): boolean {
    if (Boolean(step.is_optional)) {
      return true;
    }
    if (!this.stepExtensionEvaluator.isEnabled()) {
      return false;
    }
    const extensions = parseJsonColumn(step.step_extensions_json);
    return extensions.allowSkip === true;
  }

  private async isStepVisible(
    qr: QueryRunner,
    proc: {
      subject_type: string;
      subject_id: number;
      subject_metadata: Record<string, unknown> | null;
      context: Record<string, unknown> | null;
    } | null,
    step: StepRow,
  ): Promise<boolean> {
    const extensions = parseJsonColumn(step.step_extensions_json);
    const bindings = await this.loadBindingSummaries(qr, step.step_instance_id);

    return this.stepExtensionEvaluator.evaluate({
      processContext: proc?.context ?? null,
      subject: {
        type: proc?.subject_type ?? 'unknown',
        id: Number(proc?.subject_id ?? 0),
        metadata: proc?.subject_metadata ?? null,
      },
      step: {
        stepInstanceId: Number(step.step_instance_id),
        stepOrder: Number(step.step_order),
        status: String(step.status),
        taskType: String(step.task_type),
        isOptional: Boolean(step.is_optional),
      },
      bindings,
      extensions: Object.keys(extensions).length ? extensions : undefined,
    }).isVisible;
  }

  private async isAutoAdvanceEligible(
    qr: QueryRunner,
    proc: {
      subject_type: string;
      subject_id: number;
      subject_metadata: Record<string, unknown> | null;
      context: Record<string, unknown> | null;
    } | null,
    step: StepRow,
  ): Promise<boolean> {
    if (!this.stepExtensionEvaluator.isEnabled()) {
      return false;
    }
    if (String(step.status) !== 'ready') {
      return false;
    }
    if (String(step.task_type) === PROCESS_STEP_TASK_TYPE_CALL_PROCESS) {
      return false;
    }
    if (String(step.task_type) === 'automated') {
      return false;
    }

    const extensions = parseJsonColumn(step.step_extensions_json);
    if (!Object.keys(extensions).length) {
      return false;
    }
    const bindings = await this.loadBindingSummaries(qr, step.step_instance_id);
    const result = this.stepExtensionEvaluator.evaluate({
      processContext: proc?.context ?? null,
      subject: {
        type: proc?.subject_type ?? 'unknown',
        id: Number(proc?.subject_id ?? 0),
        metadata: proc?.subject_metadata ?? null,
      },
      step: {
        stepInstanceId: Number(step.step_instance_id),
        stepOrder: Number(step.step_order),
        status: String(step.status),
        taskType: String(step.task_type),
        isOptional: Boolean(step.is_optional),
      },
      bindings,
      extensions,
    });
    return result.autoAdvanceEligible;
  }

  private async loadBindingSummaries(
    qr: QueryRunner,
    stepInstanceId: number,
  ): Promise<ProcessStepExtensionBindingSummary[]> {
    const rows = await qr.manager.query(
      `SELECT oi.status,
              oi.core_id,
              oi.config_custom_object_instance_id,
              co.object_type,
              co.binding_mode
         FROM process_instance_step_object_instances oi
         JOIN config_objects co ON co.config_object_id = oi.config_object_id
        WHERE oi.step_instance_id = ?`,
      [stepInstanceId],
    );

    return rows.map((row: Record<string, unknown>) => ({
      objectType: String(row.object_type),
      status: String(row.status),
      ...(row.core_id != null ? { coreId: Number(row.core_id) } : {}),
      ...(row.config_custom_object_instance_id != null
        ? { instanceId: Number(row.config_custom_object_instance_id) }
        : {}),
      ...(row.binding_mode != null
        ? { resolutionMode: String(row.binding_mode) }
        : {}),
    }));
  }

  private async skipHiddenStep(
    qr: QueryRunner,
    tenantId: number,
    step: StepRow,
    opts: AdvanceOptions,
  ): Promise<void> {
    await this.transitionStep(
      qr,
      step,
      String(step.status),
      'skipped',
      {},
      {
        ...opts,
        cause: opts.cause ?? 'system',
        executionLogMetadata: { action: 'skipped', reason: 'hidden' },
      },
      tenantId,
    );
    await this.dispatchStepStateChanged(qr, step, 'skipped', opts);
  }

  private async buildProcessStepReadyEventOptions(
    qr: QueryRunner,
    step: Pick<
      StepRow,
      'step_instance_id' | 'process_instance_id' | 'step_order' | 'name'
    >,
    procMeta: {
      tenantId?: number;
      processTemplateId?: number;
      correlationId?: string;
      customerCoreId?: number;
    },
    opts: AdvanceOptions,
  ) {
    const assignees = await this.stepAssignees.resolveForStep(
      step.step_instance_id,
      qr.manager,
    );

    return buildProcessStepEventOptions({
      ...procMeta,
      stepInstanceId: step.step_instance_id,
      processInstanceId: step.process_instance_id,
      stepOrder: step.step_order,
      stepName: step.name ?? undefined,
      correlationId: opts.correlationId ?? procMeta.correlationId,
      cause: opts.cause,
      actorTenantUserId: opts.actorTenantUserId,
      assigneeId: assignees.primaryAssigneeId ?? undefined,
      assigneeIds: assignees.assigneeIds,
    });
  }

  private async resolveProcessEventMeta(
    qr: QueryRunner,
    processInstanceId: number,
  ): Promise<{
    tenantId?: number;
    processTemplateId?: number;
    correlationId?: string;
    customerCoreId?: number;
  }> {
    const proc = await loadProcessInstanceRow(qr.manager, processInstanceId);
    const context = parseJsonColumn(proc?.context);
    const customerCoreId =
      coercePositiveInt(context?.customerId) ??
      coercePositiveInt(context?.customer_id);

    return {
      tenantId: proc?.tenant_id ?? 0,
      processTemplateId: proc?.process_template_id,
      correlationId: proc?.correlation_id ?? undefined,
      ...(customerCoreId ? { customerCoreId } : {}),
    };
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

  private async transitionStep(
    qr: QueryRunner,
    step: Pick<
      StepRow,
      | 'step_instance_id'
      | 'process_instance_id'
      | 'step_order'
      | 'name'
    >,
    previousStatus: string,
    next: ProcessEngineState,
    times: Partial<{
      ready_at: Date;
      started_at: Date;
      completed_at: Date;
      canceled_at: Date;
    }> = {},
    opts: AdvanceOptions = {},
    tenantId = 0,
  ): Promise<void> {
    const occurredAt =
      times.completed_at ??
      times.started_at ??
      times.ready_at ??
      times.canceled_at ??
      new Date();

    await this.setState(qr, step.step_instance_id, next, times);
    await this.stepExecutionLog.recordTransition(qr, {
      processInstanceId: step.process_instance_id,
      stepInstanceId: step.step_instance_id,
      tenantId,
      stepOrder: step.step_order,
      stepName: step.name ?? null,
      previousStatus,
      newStatus: next,
      cause: opts.cause ?? 'system',
      actorTenantUserId: opts.actorTenantUserId,
      correlationId: opts.correlationId,
      metadata: opts.executionLogMetadata ?? null,
      occurredAt,
    });
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

  private async rollbackTx(qr: QueryRunner) {
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

function parseJsonColumn(value: unknown): Record<string, unknown> {
  if (value == null) {
    return {};
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}
