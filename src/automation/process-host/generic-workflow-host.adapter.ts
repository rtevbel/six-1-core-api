import { Injectable, Logger } from '@nestjs/common';
import { PROCESS_SUBJECT_TYPE_WORKFLOW } from '../process-subject.constants';
import { BaseProcessHostAdapter } from './base-process-host.adapter';
import type { ProcessHostContext } from './process-host.context';

/**
 * Tier 3 — context-only workflows (no kanban tasks, no standalone instance anchor).
 */
@Injectable()
export class GenericWorkflowHostAdapter extends BaseProcessHostAdapter {
  private readonly logger = new Logger(GenericWorkflowHostAdapter.name);

  readonly subjectType = PROCESS_SUBJECT_TYPE_WORKFLOW;

  async onProcessStarted(ctx: ProcessHostContext): Promise<void> {
    if (ctx.subjectId !== ctx.processInstanceId) {
      await ctx.entityManager.query(
        `UPDATE process_instances
            SET subject_id = ?
          WHERE process_instance_id = ?`,
        [ctx.processInstanceId, ctx.processInstanceId],
      );
    }

    this.logger.debug(
      `Workflow process started instance=${ctx.processInstanceId} tenant=${ctx.tenantId}`,
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
