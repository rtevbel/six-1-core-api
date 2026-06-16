import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProcessStepExecutionLogEntity } from '../process_instances/entities/process_step_execution_log.entity';

@Injectable()
export class ProcessStepFailureService {
  private readonly logger = new Logger(ProcessStepFailureService.name);

  constructor(private readonly ds: DataSource) {}

  async markFailed(params: {
    stepInstanceId: number;
    processInstanceId: number;
    tenantId: number;
    stepOrder: number;
    stepName?: string | null;
    correlationId?: string | null;
    actorTenantUserId?: number;
    errorCode?: string;
    errorDetail?: string;
  }): Promise<void> {
    await this.ds.transaction(async (em) => {
      const [step] = await em.query(
        `SELECT status
           FROM process_instance_steps
          WHERE step_instance_id = ?
          LIMIT 1
          FOR UPDATE`,
        [params.stepInstanceId],
      );
      const prev = String(step?.status ?? '');
      if (!['ready', 'in_progress'].includes(prev)) {
        return;
      }

      await em.query(
        `UPDATE process_instance_steps
            SET status = 'failed',
                updated_at = NOW()
          WHERE step_instance_id = ?`,
        [params.stepInstanceId],
      );

      await em.insert(ProcessStepExecutionLogEntity, {
        processInstanceId: params.processInstanceId,
        stepInstanceId: params.stepInstanceId,
        tenantId: params.tenantId,
        stepOrder: params.stepOrder,
        stepName: params.stepName ?? null,
        event: 'step_failed',
        previousStatus: prev,
        newStatus: 'failed',
        cause: 'system',
        actorTenantUserId: params.actorTenantUserId ?? null,
        correlationId: params.correlationId ?? null,
        metadata: {
          action: 'failed',
          ...(params.errorCode ? { errorCode: params.errorCode } : {}),
          ...(params.errorDetail ? { errorDetail: params.errorDetail } : {}),
        },
        occurredAt: new Date(),
      });
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to mark step failed: ${message}`);
    });
  }
}

