import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigCustomObjectInstanceEntity } from '../../config_objects/entities/config_custom_object_instance.entity';
import { PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE } from '../process-subject.constants';
import { BaseProcessHostAdapter } from './base-process-host.adapter';
import type { ProcessHostContext } from './process-host.context';

/**
 * Tier 2 — job anchored on a standalone configurable object instance.
 */
@Injectable()
export class ConfigurableInstanceHostAdapter extends BaseProcessHostAdapter {
  private readonly logger = new Logger(ConfigurableInstanceHostAdapter.name);

  readonly subjectType = PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE;

  constructor(
    @InjectRepository(ConfigCustomObjectInstanceEntity)
    private readonly instanceRepository: Repository<ConfigCustomObjectInstanceEntity>,
  ) {
    super();
  }

  async onProcessStarted(ctx: ProcessHostContext): Promise<void> {
    const instance = await this.instanceRepository.findOne({
      where: {
        configCustomObjectInstanceId: ctx.subjectId,
        tenantId: ctx.tenantId,
      },
    });

    if (!instance) {
      this.logger.warn(
        `Configurable instance subject not found: instanceId=${ctx.subjectId} tenant=${ctx.tenantId}`,
      );
      return;
    }

    if (instance.status === 'ARCHIVED') {
      this.logger.warn(
        `Process started for archived instance id=${ctx.subjectId}`,
      );
      return;
    }

    this.logger.debug(
      `Process ${ctx.processInstanceId} linked to config instance ${ctx.subjectId}`,
    );
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
