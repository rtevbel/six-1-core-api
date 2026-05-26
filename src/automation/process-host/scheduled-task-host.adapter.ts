import { Injectable, Logger } from '@nestjs/common';
import { PROCESS_SUBJECT_TYPE_SCHEDULED_TASK } from '../process-subject.constants';
import type { ProcessEngineState } from '../process-engine-state';
import { BaseProcessHostAdapter } from './base-process-host.adapter';
import type {
  ProcessHostContext,
  StepStateChangedContext,
} from './process-host.context';
import { mapEngineStateToScheduledTaskStatus } from './scheduled-task-engine-status.map';

/**
 * Tier 1 — scheduled job processes: sync scheduler row status; no kanban tasks.
 */
@Injectable()
export class ScheduledTaskHostAdapter extends BaseProcessHostAdapter {
  private readonly logger = new Logger(ScheduledTaskHostAdapter.name);

  readonly subjectType = PROCESS_SUBJECT_TYPE_SCHEDULED_TASK;

  async onProcessStarted(ctx: ProcessHostContext): Promise<void> {
    const em = ctx.entityManager;
    const scheduledTaskId = ctx.subjectId;

    await em.query(
      `UPDATE scheduled_tasks
          SET process_instance_id = ?,
              status = 'scheduled',
              updated_at = NOW()
        WHERE scheduled_task_id = ?
          AND tenant_id = ?`,
      [ctx.processInstanceId, scheduledTaskId, ctx.tenantId],
    );

    this.logger.debug(
      `Linked process ${ctx.processInstanceId} to scheduled_task ${scheduledTaskId}`,
    );
  }

  async onStepStateChanged(ctx: StepStateChangedContext): Promise<void> {
    await this.syncScheduledTaskStatus(
      ctx.entityManager,
      ctx.subjectId,
      ctx.tenantId,
      ctx.engineState as ProcessEngineState,
      ctx.advance?.actorTenantUserId,
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

  async onProcessCompleted(ctx: ProcessHostContext): Promise<void> {
    const em = ctx.entityManager;
    const scheduledTaskId = await this.resolveScheduledTaskId(em, ctx);
    if (!scheduledTaskId) {
      return;
    }

    await em.query(
      `UPDATE scheduled_tasks
          SET status = 'completed',
              actual_end_utc = COALESCE(actual_end_utc, NOW(6)),
              is_active = 0,
              updated_at = NOW()
        WHERE scheduled_task_id = ?
          AND tenant_id = ?`,
      [scheduledTaskId, ctx.tenantId],
    );

    this.logger.debug(
      `Scheduled task ${scheduledTaskId} completed for process ${ctx.processInstanceId}`,
    );
  }

  private async syncScheduledTaskStatus(
    em: ProcessHostContext['entityManager'],
    scheduledTaskId: number,
    tenantId: number,
    engineState: ProcessEngineState,
    updatedBy?: number,
  ): Promise<void> {
    const nextStatus = mapEngineStateToScheduledTaskStatus(engineState);
    if (!nextStatus) {
      return;
    }

    let sql = `UPDATE scheduled_tasks
                  SET status = ?`;
    const params: unknown[] = [nextStatus];

    if (engineState === 'in_progress') {
      sql += `, actual_start_utc = COALESCE(actual_start_utc, NOW(6))`;
    }

    if (updatedBy != null) {
      sql += `, updated_by = ?`;
      params.push(updatedBy);
    }

    sql += `, updated_at = NOW()
              WHERE scheduled_task_id = ?
                AND tenant_id = ?`;
    params.push(scheduledTaskId, tenantId);

    await em.query(sql, params);
  }

  private async resolveScheduledTaskId(
    em: ProcessHostContext['entityManager'],
    ctx: ProcessHostContext,
  ): Promise<number | null> {
    if (ctx.subjectType === PROCESS_SUBJECT_TYPE_SCHEDULED_TASK && ctx.subjectId > 0) {
      return ctx.subjectId;
    }

    const [row] = await em.query(
      `SELECT scheduled_task_id
         FROM scheduled_tasks
        WHERE process_instance_id = ?
          AND tenant_id = ?
        LIMIT 1`,
      [ctx.processInstanceId, ctx.tenantId],
    );

    return row?.scheduled_task_id != null
      ? Number(row.scheduled_task_id)
      : null;
  }
}
