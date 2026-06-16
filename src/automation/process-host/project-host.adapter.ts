import { Injectable } from '@nestjs/common';
import { EventsService } from '../../events/events.service';
import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import {
  PLATFORM_SOR_OBJECT_TYPES,
  buildSorBoundDomainEventOptions,
} from '../../events/platform-domain-event.util';
import type { ProcessEngineState } from '../process-engine-state';
import { PROCESS_SUBJECT_TYPE_PROJECT } from '../process-subject.constants';
import { BaseProcessHostAdapter } from './base-process-host.adapter';
import type {
  ProcessHostContext,
  StepStateChangedContext,
} from './process-host.context';
import { generateTaskIdentifierFromName } from './task-identifier.util';

export interface ProjectHostStartData {
  projectId: number;
  statusIdByName: Record<string, number>;
}

type InstanceStepRow = {
  step_instance_id: number;
  name: string;
  task_type: string | null;
  step_order: number;
  status: string;
};

/**
 * Tier 1 — project-bound processes: kanban mappings and process-controlled tasks.
 */
@Injectable()
export class ProjectHostAdapter extends BaseProcessHostAdapter {
  readonly subjectType = PROCESS_SUBJECT_TYPE_PROJECT;

  constructor(private readonly events: EventsService) {
    super();
  }

  async onStepStateChanged(ctx: StepStateChangedContext): Promise<void> {
    await this.syncTaskColumn(
      ctx.entityManager,
      ctx.stepInstanceId,
      ctx.engineState as ProcessEngineState,
      ctx.tenantId,
      ctx.advance?.actorTenantUserId,
      ctx.advance?.correlationId ?? ctx.correlationId ?? undefined,
    );
  }

  async canCompleteJob(ctx: ProcessHostContext): Promise<boolean> {
    const em = ctx.entityManager;
    const [agg] = await em.query(
      `SELECT
         SUM(s.status = 'completed') AS completed_count,
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
    const processInstanceId = ctx.processInstanceId;

    let projectId: number | null = null;

    if (ctx.subjectType === PROCESS_SUBJECT_TYPE_PROJECT && ctx.subjectId > 0) {
      projectId = ctx.subjectId;
    } else {
      const [pi] = await em.query(
        `SELECT project_id FROM projects WHERE process_instance_id = ? LIMIT 1`,
        [processInstanceId],
      );
      if (pi?.project_id) {
        projectId = Number(pi.project_id);
      }
    }

    if (!projectId) {
      const [t] = await em.query(
        `SELECT t.project_id
           FROM tasks t
           JOIN process_instance_steps s ON s.step_instance_id = t.step_instance_id
          WHERE s.process_instance_id = ?
          LIMIT 1`,
        [processInstanceId],
      );
      if (t?.project_id) {
        projectId = Number(t.project_id);
      }
    }

    if (!projectId) {
      return;
    }

    await em.query(
      `UPDATE projects
          SET status = 'completed',
              completed_at = COALESCE(completed_at, NOW()),
              updated_at = NOW()
        WHERE project_id = ? AND status <> 'completed'`,
      [projectId],
    );

    this.events.emit(
      PLATFORM_EVENT_NAMES.PROJECT_STATUS_CHANGED,
      buildSorBoundDomainEventOptions({
        objectType: PLATFORM_SOR_OBJECT_TYPES.PROJECT,
        coreId: projectId,
        tenantId: ctx.tenantId,
        actorUserId: ctx.advance?.actorTenantUserId ?? ctx.createdBy ?? 1,
        correlationId: ctx.advance?.correlationId ?? ctx.correlationId ?? undefined,
        data: { processInstanceId },
      }),
    );
  }

  async onProcessStarted(ctx: ProcessHostContext): Promise<void> {
    const hostData = ctx.hostData as ProjectHostStartData | undefined;
    if (!hostData?.projectId || !hostData?.statusIdByName) {
      throw new Error(
        'ProjectHostAdapter requires hostData.projectId and hostData.statusIdByName',
      );
    }

    const { projectId, statusIdByName } = hostData;
    const em = ctx.entityManager;
    const piId = ctx.processInstanceId;

    const defaultMap: Record<string, string> = {
      pending: 'To Do',
      ready: 'Ready',
      in_progress: 'In Progress',
      completed: 'Done',
      blocked: 'Blocked',
      canceled: 'Done',
    };

    for (const [engineState, statusName] of Object.entries(defaultMap)) {
      const taskStatusId = statusIdByName[statusName];
      if (!taskStatusId) {
        throw new Error(`Missing status id for ${statusName}`);
      }
      await em.query(
        `INSERT IGNORE INTO project_step_status_mappings
           (project_id, step_instance_id, step_engine_state, task_status_id)
         VALUES (?, NULL, ?, ?)`,
        [projectId, engineState, taskStatusId],
      );
    }

    const instanceSteps: InstanceStepRow[] = await em.query(
      `SELECT step_instance_id, name, task_type, step_order, status
         FROM process_instance_steps
        WHERE process_instance_id = ?
        ORDER BY step_order ASC`,
      [piId],
    );

    if (!instanceSteps.length) {
      return;
    }

    const mappingRows: Array<{
      step_engine_state: string;
      task_status_id: number;
    }> = await em.query(
      `SELECT step_engine_state, task_status_id
         FROM project_step_status_mappings
        WHERE project_id = ? AND step_instance_id IS NULL`,
      [projectId],
    );

    const statusIdByEngineState = new Map<string, number>();
    for (const r of mappingRows) {
      statusIdByEngineState.set(r.step_engine_state, r.task_status_id);
    }

    const placeholders: string[] = [];
    const values: unknown[] = [];

    for (const s of instanceSteps) {
      const mappedStatusId =
        statusIdByEngineState.get(s.status) ?? statusIdByName['To Do'];
      if (!mappedStatusId) {
        throw new Error('Failed to resolve default task status id');
      }

      const identifier = s.name
        ? generateTaskIdentifierFromName(s.name)
        : `task-${s.step_instance_id}${projectId}`;

      placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, NOW())');
      values.push(
        projectId,
        ctx.tenantId,
        s.step_instance_id,
        s.name,
        identifier,
        null,
        'medium',
        2.0,
        null,
        mappedStatusId,
        'process',
        null,
        'manual',
        4,
        null,
        null,
        null,
        null,
        ctx.createdBy,
        ctx.createdBy,
      );
    }

    await em.query(
      `INSERT INTO tasks
         (project_id, tenant_id, step_instance_id, name, task_indentifier, description, priority, estimated_duration, parent_task_id, task_status_id, status_control, effort_hours , scheduling_mode , default_shift_hours , primary_assignee_id , team_id , start_constraint_utc , finish_constraint_utc , created_by, updated_by, created_at)
       VALUES ${placeholders.join(',')}`,
      values,
    );
  }

  /**
   * Move the task kanban column for process-controlled tasks (formerly in orchestrator).
   */
  private async syncTaskColumn(
    em: ProcessHostContext['entityManager'],
    stepInstanceId: number,
    engineState: ProcessEngineState,
    tenantId: number,
    actorTenantUserId?: number,
    correlationId?: string,
  ): Promise<void> {
    const [task] = await em.query(
      `SELECT t.task_id, t.project_id, t.status_control
         FROM tasks t
        WHERE t.step_instance_id = ?
        LIMIT 1`,
      [stepInstanceId],
    );
    if (!task) {
      return;
    }
    if (!['process', 'hybrid'].includes(task.status_control)) {
      return;
    }

    const [map] = await em.query(
      `SELECT m.task_status_id
         FROM project_step_status_mappings m
        WHERE m.project_id = ?
          AND m.step_engine_state = ?
          AND (m.step_instance_id = ? OR m.step_instance_id IS NULL)
        ORDER BY m.step_instance_id IS NULL ASC
        LIMIT 1`,
      [task.project_id, engineState, stepInstanceId],
    );
    if (!map?.task_status_id) {
      return;
    }

    await em.query(
      `UPDATE tasks
          SET task_status_id = ?, updated_at = NOW()
        WHERE task_id = ?`,
      [map.task_status_id, task.task_id],
    );

    this.events.emit(
      PLATFORM_EVENT_NAMES.TASK_STATUS_CHANGED,
      buildSorBoundDomainEventOptions({
        objectType: PLATFORM_SOR_OBJECT_TYPES.TASK,
        coreId: Number(task.task_id),
        tenantId,
        actorUserId: actorTenantUserId ?? 1,
        correlationId,
        data: {
          projectId: task.project_id,
          stepInstanceId,
          toStatusId: map.task_status_id,
          engineState,
        },
      }),
    );
  }
}
