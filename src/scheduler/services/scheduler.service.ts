import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import { RpcException } from '@nestjs/microservices';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DateTime } from 'luxon';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { TaskContextProvider } from '../core/interfaces';
import { TASK_CONTEXT_PROVIDER } from '../constants';
import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';
import { ResourceAssignmentShiftEntity } from '../entities/resource_assignment_shifts.entity';
import { ResourceAssignmentEntity } from '../entities/resource_assignment.entity';
import { ScheduledTasksService } from './scheduled_tasks.service';
import { HistoryService } from './history.service';
import { EventsService } from './events.service';
import { ResourceAssignmentsService } from './resource_assignments.service';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../../common/constants';
import { FiltersDto } from '../dto/filters.dto';
import { FindAllResultInterface } from '../interfaces/findall-result.interface';
import { ScheduledTaskProcessBootstrapService } from '../../automation/scheduled-task-process-bootstrap.service';
import { ConstraintCapacityEngine } from '../constraints/constraint-capacity.engine';
import { ConstraintConflict } from '../constraints/constraint.types';

/**
 * SchedulerService (execution layer):
 * - Fits windows via ConstraintCapacityEngine
 * - Enforces capacity/calendar/resource constraints
 * - Manages parent/child lifecycle + BullMQ jobs
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue('task-scheduler') private readonly queue: Queue,
    @Inject(TASK_CONTEXT_PROVIDER)
    private readonly taskCtx: TaskContextProvider,
    private readonly constraints: ConstraintCapacityEngine,
    private readonly scheduledTasks: ScheduledTasksService,
    private readonly history: HistoryService,
    private readonly events: EventsService,
    private readonly resourceAssignments: ResourceAssignmentsService,
    private readonly dataSource: DataSource,
    @InjectRepository(ScheduledTaskEntity)
    private readonly schedRepo: Repository<ScheduledTaskEntity>,
    @InjectRepository(ResourceAssignmentEntity)
    private readonly assignmentRepo: Repository<ResourceAssignmentEntity>,
    private readonly scheduledTaskProcess: ScheduledTaskProcessBootstrapService,
  ) {}

  private msUntil(d: Date): number {
    return Math.max(0, DateTime.fromJSDate(d).diffNow().milliseconds);
  }

  private assertNoHardConflicts(conflicts: ConstraintConflict[]): void {
    const hard = conflicts.filter((c) => c.severity === 'hard');
    if (!hard.length) return;
    throw new RpcException({
      message: 'Scheduling constraints violated',
      conflicts: hard,
    });
  }

  private async removeJobsForRows(
    rows: ScheduledTaskEntity[],
  ): Promise<void> {
    for (const row of rows) {
      for (const token of [row.startJobToken, row.endJobToken]) {
        if (!token) continue;
        try {
          await this.queue.remove(token);
        } catch (err) {
          this.logger.debug(
            `Job remove skipped for token ${token}: ${String(err)}`,
          );
        }
      }
    }
  }

  /**
   * Deactivates all active rows for a task and removes their BullMQ jobs.
   */
  async replaceActiveSchedulesForTask(taskId: number): Promise<void> {
    const previous = await this.scheduledTasks.deactivateAllForTask(taskId);
    await this.removeJobsForRows(previous);
    for (const row of previous) {
      await this.history.snapshot({ ...row, isActive: 0, status: 'cancelled' });
    }
  }

  /**
   * Schedules a parent window (no assignee) after constraint fitting + validation.
   */
  async scheduleTaskWindow(
    userId: number,
    input: {
      taskId: number;
      requestedStartUtc: Date;
      requestedEndUtc: Date;
      priority?: number;
      parentScheduledTaskId?: number | null;
      processTemplateId?: number;
      createdBy?: number;
      /** When true (default for root parents), deactivate prior active rows. */
      replaceExisting?: boolean;
    },
  ) {
    const ctx = await this.taskCtx.getTaskContext(input.taskId);
    const { tenantId, taskStatusId } = ctx;

    const isRootParent = input.parentScheduledTaskId == null;
    const replaceExisting = input.replaceExisting ?? isRootParent;
    if (replaceExisting && isRootParent) {
      await this.replaceActiveSchedulesForTask(input.taskId);
    }

    const fitted = await this.constraints.fitWindow({
      tenantId,
      tenantUserId: null,
      requestedStartUtc: input.requestedStartUtc,
      requestedEndUtc: input.requestedEndUtc,
      taskId: input.taskId,
      applyDependencyGate: true,
      applyTaskConstraints: true,
    });

    const validation = await this.constraints.validatePlacement({
      tenantId,
      taskId: input.taskId,
      tenantUserId: null,
      startUtc: fitted.effectiveStartUtc,
      endUtc: fitted.effectiveEndUtc,
      teamId: ctx.teamId,
      mode: 'parent_window',
    });
    this.assertNoHardConflicts([...validation.hard, ...validation.soft]);

    const row = await this.scheduledTasks.createActive({
      parentScheduledTaskId: input.parentScheduledTaskId ?? null,
      tenantId,
      tenantUserId: null,
      taskId: input.taskId,
      taskStatusId,
      requestedStartUtc: input.requestedStartUtc,
      requestedEndUtc: input.requestedEndUtc,
      effectiveStartUtc: fitted.effectiveStartUtc,
      effectiveEndUtc: fitted.effectiveEndUtc,
      tzUsed: fitted.tzUsed,
      dependencyGateUtc: fitted.dependencyGateUtc ?? null,
      priority: input.priority ?? 0,
      startJobToken: randomUUID(),
      endJobToken: randomUUID(),
      blockReason: 'none',
      startAttempts: 0,
      endAttempts: 0,
      calendarSnapshot: {
        softConflicts: validation.soft,
      },
      dependencySnapshot: {
        dependencyGateUtc: fitted.dependencyGateUtc,
      },
    } as Partial<ScheduledTaskEntity>);

    await this.history.snapshot(row);

    let processInstanceId: number | null = null;
    if (input.processTemplateId && input.createdBy) {
      const attached = await this.scheduledTaskProcess.attachProcessIfEnabled({
        tenantId,
        createdBy: input.createdBy,
        scheduledTaskId: row.scheduledTaskId,
        processTemplateId: input.processTemplateId,
        context: { taskId: input.taskId },
      });
      processInstanceId = attached.processInstanceId;
    }

    return {
      scheduledTaskId: row.scheduledTaskId,
      effectiveStartUtc: row.effectiveStartUtc,
      effectiveEndUtc: row.effectiveEndUtc,
      tzUsed: row.tzUsed,
      processInstanceId,
      softConflicts: validation.soft,
    };
  }

  /**
   * Schedules serial child shifts with constraint checks and post-commit job enqueue.
   */
  async scheduleFromShifts(
    userId: number,
    input: {
      taskId: number;
      priority?: number;
      parentScheduledTaskId?: number;
      shifts: Array<{
        resourceAssignmentId: number;
        tenantUserId: number;
        plannedStartUtc: Date;
        plannedEndUtc: Date;
        sequenceNo?: number;
      }>;
    },
  ) {
    if (!input.shifts?.length) {
      throw new RpcException('No shifts provided');
    }

    const assignmentIds = input.shifts.map((s) => s.resourceAssignmentId);
    await this.resourceAssignments.validateExistence(assignmentIds);

    const assignments = await this.assignmentRepo.find({
      where: { resourceAssignmentId: In(assignmentIds) },
    });
    const assignmentById = new Map(
      assignments.map((a) => [a.resourceAssignmentId, a]),
    );

    const ctx = await this.taskCtx.getTaskContext(input.taskId);
    const { tenantId, taskStatusId } = ctx;
    const ordered = [...input.shifts].sort(
      (a, b) => (a.sequenceNo ?? 1) - (b.sequenceNo ?? 1),
    );

    for (let i = 1; i < ordered.length; i++) {
      const prevEnd = DateTime.fromJSDate(ordered[i - 1].plannedEndUtc);
      const curStart = DateTime.fromJSDate(ordered[i].plannedStartUtc);
      if (curStart < prevEnd) {
        ordered[i].plannedStartUtc = prevEnd.toJSDate();
        if (DateTime.fromJSDate(ordered[i].plannedEndUtc) < prevEnd) {
          ordered[i].plannedEndUtc = prevEnd.plus({ minutes: 1 }).toJSDate();
        }
      }
    }

    type Prepared = {
      shiftInput: (typeof ordered)[number];
      seq: number;
      resourceId?: number;
      effStart: Date;
      effEnd: Date;
      tz: string;
      softConflicts: ConstraintConflict[];
    };

    const prepared: Prepared[] = [];
    let prevChildEndUtc: Date | null = null;

    for (const s of ordered) {
      const seq = s.sequenceNo ?? 1;
      const assignment = assignmentById.get(s.resourceAssignmentId);
      const resourceId = assignment?.resourceId;

      const serialStart =
        prevChildEndUtc &&
        DateTime.fromJSDate(s.plannedStartUtc) <
          DateTime.fromJSDate(prevChildEndUtc)
          ? prevChildEndUtc
          : s.plannedStartUtc;

      const plannedDurationMs = Math.max(
        0,
        DateTime.fromJSDate(s.plannedEndUtc).diff(
          DateTime.fromJSDate(s.plannedStartUtc),
          'milliseconds',
        ).milliseconds,
      );

      const fitted = await this.constraints.fitWindow({
        tenantId,
        tenantUserId: s.tenantUserId,
        requestedStartUtc: serialStart,
        durationMs: plannedDurationMs,
        taskId: input.taskId,
        applyDependencyGate: false,
        applyTaskConstraints: false,
      });

      let effStart = fitted.effectiveStartUtc;
      let effEnd = fitted.effectiveEndUtc;

      // Push past soft user overlaps once (legacy behavior), then hard-validate
      const userOverlaps = await this.scheduledTasks.findUserOverlaps(
        s.tenantUserId,
        effStart,
        effEnd,
      );
      if (userOverlaps.length) {
        const maxEnd = userOverlaps.reduce(
          (m, r) => (r.effectiveEndUtc > m ? r.effectiveEndUtc : m),
          effStart,
        );
        const pushed = await this.constraints.fitWindow({
          tenantId,
          tenantUserId: s.tenantUserId,
          requestedStartUtc: DateTime.fromJSDate(maxEnd)
            .plus({ minutes: 1 })
            .toJSDate(),
          durationMs: plannedDurationMs,
          applyDependencyGate: false,
          applyTaskConstraints: false,
        });
        effStart = pushed.effectiveStartUtc;
        effEnd = pushed.effectiveEndUtc;
      }

      const validation = await this.constraints.validatePlacement({
        tenantId,
        taskId: input.taskId,
        tenantUserId: s.tenantUserId,
        resourceId,
        startUtc: effStart,
        endUtc: effEnd,
        teamId: ctx.teamId,
        mode: 'shift',
      });
      this.assertNoHardConflicts([...validation.hard, ...validation.soft]);

      const sameTaskConf = await this.scheduledTasks.findTaskChildOverlaps(
        input.taskId,
        effStart,
        effEnd,
      );
      if (sameTaskConf.length) {
        throw new RpcException(
          'Same-task child overlap after constraint fit; adjust shifts or durations.',
        );
      }

      prepared.push({
        shiftInput: s,
        seq,
        resourceId,
        effStart,
        effEnd,
        tz: fitted.tzUsed,
        softConflicts: validation.soft,
      });
      prevChildEndUtc = effEnd;
    }

    const created: Array<{
      shiftId: number;
      scheduledTaskId: number;
      effectiveStartUtc: Date;
      effectiveEndUtc: Date;
      softConflicts: ConstraintConflict[];
    }> = [];

    const persisted = await this.dataSource.transaction(async (manager) => {
      const shiftRepo = manager.getRepository(ResourceAssignmentShiftEntity);
      const schedTxRepo = manager.getRepository(ScheduledTaskEntity);
      const rows: Array<{
        shift: ResourceAssignmentShiftEntity;
        schedule: ScheduledTaskEntity;
        softConflicts: ConstraintConflict[];
      }> = [];

      for (const p of prepared) {
        const shift = shiftRepo.create({
          resourceAssignmentId: p.shiftInput.resourceAssignmentId,
          tenantUserId: p.shiftInput.tenantUserId,
          sequenceNo: p.seq,
          plannedStartUtc: p.shiftInput.plannedStartUtc,
          plannedEndUtc: p.shiftInput.plannedEndUtc,
          status: 'planned',
        });
        const savedShift = await shiftRepo.save(shift);

        const schedule = schedTxRepo.create({
          parentScheduledTaskId: input.parentScheduledTaskId ?? null,
          tenantId,
          tenantUserId: p.shiftInput.tenantUserId,
          taskId: input.taskId,
          taskStatusId,
          requestedStartUtc: p.shiftInput.plannedStartUtc,
          requestedEndUtc: p.shiftInput.plannedEndUtc,
          effectiveStartUtc: p.effStart,
          effectiveEndUtc: p.effEnd,
          tzUsed: p.tz,
          dependencyGateUtc: null,
          priority: input.priority ?? 0,
          startJobToken: randomUUID(),
          endJobToken: randomUUID(),
          blockReason: 'none',
          startAttempts: 0,
          endAttempts: 0,
          isActive: 1,
          status: 'scheduled',
          version: 1,
          calendarSnapshot: { softConflicts: p.softConflicts },
        } as Partial<ScheduledTaskEntity>);
        const managed = await schedTxRepo.save(schedule);

        savedShift.scheduledTaskId = managed.scheduledTaskId;
        await shiftRepo.save(savedShift);

        if (p.resourceId) {
          await manager.update(
            ResourceAssignmentEntity,
            { resourceAssignmentId: p.shiftInput.resourceAssignmentId },
            {
              scheduledTaskId: managed.scheduledTaskId,
              assignedStart: p.effStart,
              assignedEnd: p.effEnd,
            },
          );
        }

        rows.push({
          shift: savedShift,
          schedule: managed,
          softConflicts: p.softConflicts,
        });
      }
      return rows;
    });

    // Enqueue jobs after DB commit
    for (const item of persisted) {
      const row = item.schedule;
      await this.history.snapshot(row);

      const startJob = await this.queue.add(
        'task.start',
        {
          scheduledTaskId: row.scheduledTaskId,
          taskId: row.taskId,
          token: row.startJobToken,
        },
        {
          jobId: row.startJobToken!,
          delay: Math.round(this.msUntil(row.effectiveStartUtc)),
          priority: row.priority,
          attempts: 5,
          backoff: { type: 'exponential', delay: 60_000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      const endJob = await this.queue.add(
        'task.end',
        {
          scheduledTaskId: row.scheduledTaskId,
          taskId: row.taskId,
          token: row.endJobToken,
        },
        {
          jobId: row.endJobToken!,
          delay: Math.round(this.msUntil(row.effectiveEndUtc)),
          priority: row.priority,
          attempts: 5,
          backoff: { type: 'exponential', delay: 60_000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      await this.scheduledTasks.markQueued(
        row.scheduledTaskId,
        String(startJob.id),
        String(endJob.id),
      );
      await this.events.emit(
        row.scheduledTaskId,
        'enqueued_start',
        { at: row.effectiveStartUtc },
        String(startJob.id),
      );
      await this.events.emit(
        row.scheduledTaskId,
        'enqueued_end',
        { at: row.effectiveEndUtc },
        String(endJob.id),
      );

      created.push({
        shiftId: item.shift.shiftId,
        scheduledTaskId: row.scheduledTaskId,
        effectiveStartUtc: row.effectiveStartUtc,
        effectiveEndUtc: row.effectiveEndUtc,
        softConflicts: item.softConflicts,
      });
    }

    return { created };
  }

  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);
    const [items, total] = await this.schedRepo.findAndCount(findQuery);
    if (!items.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ScheduledTaskEntity.name,
        ),
      );
    }
    const pagination = this.buildPagination(filtersDto, total);
    return {
      items,
      scheduledTaskRecords: items,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findAllByTask(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery({ ...filtersDto, search: undefined });
    if (filtersDto.taskId) {
      (findQuery.where as Record<string, unknown>).taskId = filtersDto.taskId;
    }
    const [items, total] = await this.schedRepo.findAndCount(findQuery);
    if (!items.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ScheduledTaskEntity.name,
        ),
      );
    }
    const pagination = this.buildPagination(filtersDto, total);
    return {
      items,
      scheduledTaskRecords: items,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(userId: number, scheduledTaskId: number) {
    const row = await this.schedRepo.findOne({ where: { scheduledTaskId } });
    if (!row) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ScheduledTaskEntity.name,
        ),
      );
    }
    return row;
  }

  async reschedule(
    userId: number,
    input: {
      scheduledTaskId: number;
      requestedStartUtc: Date;
      requestedEndUtc: Date;
    },
  ) {
    const row = await this.schedRepo.findOne({
      where: { scheduledTaskId: input.scheduledTaskId },
    });
    if (!row) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ScheduledTaskEntity.name,
        ),
      );
    }

    const fitted = await this.constraints.fitWindow({
      tenantId: row.tenantId,
      tenantUserId: row.tenantUserId ?? null,
      requestedStartUtc: input.requestedStartUtc,
      requestedEndUtc: input.requestedEndUtc,
      taskId: row.taskId,
      applyDependencyGate: row.parentScheduledTaskId == null,
      applyTaskConstraints: row.parentScheduledTaskId == null,
    });

    const assignment = await this.assignmentRepo.findOne({
      where: { scheduledTaskId: row.scheduledTaskId },
    });

    const validation = await this.constraints.validatePlacement({
      tenantId: row.tenantId,
      taskId: row.taskId,
      tenantUserId: row.tenantUserId ?? null,
      resourceId: assignment?.resourceId,
      startUtc: fitted.effectiveStartUtc,
      endUtc: fitted.effectiveEndUtc,
      excludeScheduledTaskIds: [row.scheduledTaskId],
      mode: row.tenantUserId ? 'shift' : 'parent_window',
    });
    this.assertNoHardConflicts([...validation.hard, ...validation.soft]);

    // Rotate BullMQ jobs for child schedules
    await this.removeJobsForRows([row]);
    const startToken = randomUUID();
    const endToken = randomUUID();

    row.requestedStartUtc = input.requestedStartUtc;
    row.requestedEndUtc = input.requestedEndUtc;
    row.effectiveStartUtc = fitted.effectiveStartUtc;
    row.effectiveEndUtc = fitted.effectiveEndUtc;
    row.tzUsed = fitted.tzUsed;
    row.dependencyGateUtc = fitted.dependencyGateUtc ?? row.dependencyGateUtc;
    row.startJobToken = startToken;
    row.endJobToken = endToken;
    row.version = (row.version ?? 0) + 1;
    row.updatedAt = new Date();
    await this.schedRepo.save(row);
    await this.history.snapshot(row);

    if (row.tenantUserId) {
      const startJob = await this.queue.add(
        'task.start',
        {
          scheduledTaskId: row.scheduledTaskId,
          taskId: row.taskId,
          token: startToken,
        },
        {
          jobId: startToken,
          delay: Math.round(this.msUntil(row.effectiveStartUtc)),
          priority: row.priority,
          attempts: 5,
          backoff: { type: 'exponential', delay: 60_000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      const endJob = await this.queue.add(
        'task.end',
        {
          scheduledTaskId: row.scheduledTaskId,
          taskId: row.taskId,
          token: endToken,
        },
        {
          jobId: endToken,
          delay: Math.round(this.msUntil(row.effectiveEndUtc)),
          priority: row.priority,
          attempts: 5,
          backoff: { type: 'exponential', delay: 60_000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      await this.scheduledTasks.markQueued(
        row.scheduledTaskId,
        String(startJob.id),
        String(endJob.id),
      );
    }

    return {
      scheduledTaskId: row.scheduledTaskId,
      effectiveStartUtc: row.effectiveStartUtc,
      effectiveEndUtc: row.effectiveEndUtc,
      softConflicts: validation.soft,
    };
  }

  async pause(
    userId: number,
    input: { scheduledTaskId: number; pausedUntilUtc: Date },
  ) {
    const row = await this.schedRepo.findOne({
      where: { scheduledTaskId: input.scheduledTaskId },
    });
    if (!row) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ScheduledTaskEntity.name,
        ),
      );
    }
    await this.scheduledTasks.pauseUntil(
      row.scheduledTaskId,
      input.pausedUntilUtc,
      'calendar',
    );
    return { paused: true, until: input.pausedUntilUtc };
  }

  async resume(userId: number, input: { scheduledTaskId: number }) {
    const row = await this.schedRepo.findOne({
      where: { scheduledTaskId: input.scheduledTaskId },
    });
    if (!row) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ScheduledTaskEntity.name,
        ),
      );
    }
    await this.scheduledTasks.resume(row.scheduledTaskId);
    return { resumed: true };
  }

  async cancel(userId: number, input: { scheduledTaskId: number }) {
    const row = await this.schedRepo.findOne({
      where: { scheduledTaskId: input.scheduledTaskId },
    });
    if (!row) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ScheduledTaskEntity.name,
        ),
      );
    }

    const toCancel: ScheduledTaskEntity[] = [row];
    if (row.parentScheduledTaskId == null) {
      const children = await this.schedRepo.find({
        where: {
          taskId: row.taskId,
          isActive: 1,
        },
      });
      for (const child of children) {
        if (child.scheduledTaskId !== row.scheduledTaskId) {
          toCancel.push(child);
        }
      }
    }

    await this.removeJobsForRows(toCancel);
    for (const r of toCancel) {
      r.status = 'cancelled';
      r.isActive = 0;
      r.updatedAt = new Date();
      await this.schedRepo.save(r);
      await this.history.snapshot(r);
    }

    return { cancelled: true, cancelledCount: toCancel.length };
  }

  /**
   * Dry-run placement validation (Phase 0 planner/ops API).
   */
  async validatePlacement(
    userId: number,
    input: {
      tenantId: number;
      taskId?: number;
      tenantUserId?: number | null;
      resourceId?: number | null;
      startUtc: Date;
      endUtc: Date;
      teamId?: number | null;
      mode?: 'parent_window' | 'shift' | 'assignment';
      excludeScheduledTaskIds?: number[];
      horizonStartUtc?: Date;
      horizonEndUtc?: Date;
    },
  ) {
    return this.constraints.validatePlacement(input);
  }

  async utilization(
    userId: number,
    input: {
      tenantId: number;
      fromUtc: Date;
      toUtc: Date;
      resourceIds?: number[];
      tenantUserIds?: number[];
      teamId?: number;
    },
  ) {
    return this.constraints.utilization(input);
  }

  private buildFindQuery(filtersDto: FiltersDto): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    query.where = { tenantId: filtersDto.tenantId, isActive: 1 };

    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page || 1;
      filtersDto.limit = Math.min(filtersDto.limit, 10);
      query.take = filtersDto.limit;
      query.skip = (filtersDto.page - 1) * filtersDto.limit;
    }

    return query;
  }

  private buildPagination(
    filtersDto: FiltersDto,
    total: number,
  ): RuntimeV2ListPagination {
    return buildRuntimeV2ListPagination(
      filtersDto.page,
      filtersDto.limit,
      total,
      10,
    );
  }
}
