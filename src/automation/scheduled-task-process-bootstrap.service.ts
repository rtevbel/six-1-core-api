import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import { ProcessLifecycleFacade } from './process-lifecycle.facade';
import { StepOrchestratorService } from './step-orchestrator.service';

export interface AttachProcessToScheduledTaskParams {
  tenantId: number;
  createdBy: number;
  scheduledTaskId: number;
  processTemplateId: number;
  context?: Record<string, unknown> | null;
  correlationId?: string | null;
  entityManager?: EntityManager;
}

/**
 * Starts a dynamic process for an active scheduled task and advances the first step.
 */
@Injectable()
export class ScheduledTaskProcessBootstrapService {
  private readonly logger = new Logger(ScheduledTaskProcessBootstrapService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly lifecycle: ProcessLifecycleFacade,
    private readonly orchestrator: StepOrchestratorService,
    private readonly flags: ProcessFeatureFlagsService,
  ) {}

  isEnabled(): boolean {
    return (
      this.flags.isSubjectModelEnabled() &&
      this.flags.isTier1ScheduledTaskEnabled()
    );
  }

  async attachProcessIfEnabled(
    params: AttachProcessToScheduledTaskParams,
  ): Promise<{ processInstanceId: number | null; firstStepInstanceId: number | null }> {
    if (!this.isEnabled() || !params.processTemplateId) {
      return { processInstanceId: null, firstStepInstanceId: null };
    }

    const run = async (em: EntityManager) => {
      const [existing] = await em.query(
        `SELECT process_instance_id
           FROM scheduled_tasks
          WHERE scheduled_task_id = ?
            AND tenant_id = ?
          LIMIT 1`,
        [params.scheduledTaskId, params.tenantId],
      );

      if (existing?.process_instance_id) {
        return {
          processInstanceId: Number(existing.process_instance_id),
          firstStepInstanceId: null,
        };
      }

      const result = await this.lifecycle.startProcessForScheduledTask({
        tenantId: params.tenantId,
        createdBy: params.createdBy,
        templateId: params.processTemplateId,
        scheduledTaskId: params.scheduledTaskId,
        context: {
          ...(params.context ?? {}),
          scheduledTaskId: params.scheduledTaskId,
        },
        correlationId: params.correlationId,
        entityManager: em,
      });

      return result;
    };

    const result = params.entityManager
      ? await run(params.entityManager)
      : await this.ds.transaction('READ COMMITTED', run);

    if (result.firstStepInstanceId) {
      await this.orchestrator.attemptAdvance(result.firstStepInstanceId, {
        cause: 'event',
        correlationId: params.correlationId ?? undefined,
        actorTenantUserId: params.createdBy,
      });
    }

    this.logger.debug(
      `Attached process ${result.processInstanceId} to scheduled_task ${params.scheduledTaskId}`,
    );

    return result;
  }
}
