import { Injectable, Logger } from '@nestjs/common';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import { PROCESS_SUBJECT_TYPE_SOR_ENTITY } from '../process-subject.constants';
import { BaseProcessHostAdapter } from './base-process-host.adapter';
import type { ProcessHostContext } from './process-host.context';

/**
 * Tier 4 — job anchored on an existing SoR / system_table row (`sor_entity` subject).
 */
@Injectable()
export class SorEntityHostAdapter extends BaseProcessHostAdapter {
  private readonly logger = new Logger(SorEntityHostAdapter.name);

  readonly subjectType = PROCESS_SUBJECT_TYPE_SOR_ENTITY;

  constructor(private readonly configObjectsService: ConfigObjectsService) {
    super();
  }

  async onProcessStarted(ctx: ProcessHostContext): Promise<void> {
    const meta = ctx.subjectMetadata ?? {};
    const objectType = String(meta.objectType ?? meta.object_type ?? '');
    const coreId = Number(meta.coreId ?? meta.core_id ?? ctx.subjectId);

    if (!objectType || !coreId) {
      this.logger.warn(
        `sor_entity subject missing objectType/coreId for process ${ctx.processInstanceId}`,
      );
      return;
    }

    try {
      const resolved = await this.configObjectsService.resolveObjectInstance(
        ctx.tenantId,
        objectType,
        coreId,
      );
      if (!resolved) {
        this.logger.warn(
          `sor_entity anchor not found: ${objectType}#${coreId} tenant=${ctx.tenantId}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `sor_entity anchor validation failed for process ${ctx.processInstanceId}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async canCompleteJob(ctx: ProcessHostContext): Promise<boolean> {
    const [agg] = await ctx.entityManager.query(
      `SELECT SUM(s.status = 'completed') AS completed_count,
              COUNT(*) AS total_count
         FROM process_instance_steps s
        WHERE s.process_instance_id = ?`,
      [ctx.processInstanceId],
    );

    if (!agg || Number(agg.total_count) === 0) {
      return false;
    }

    return Number(agg.completed_count) === Number(agg.total_count);
  }
}
