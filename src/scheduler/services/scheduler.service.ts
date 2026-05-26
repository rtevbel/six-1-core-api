import {  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';

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
import { Repository } from 'typeorm';
import { ScheduleWindowDto } from '../dto/schedule-window.dto';

import { CalendarProvider, TaskContextProvider } from '../core/interfaces';
import { TASK_CONTEXT_PROVIDER, CALENDAR_PROVIDER } from '../constants';
import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';
import { ResourceAssignmentShiftEntity } from '../entities/resource_assignment_shifts.entity';
import { ScheduledTasksService } from './scheduled_tasks.service';
import { DependencyResolverService } from './dependency_resolver.service';
import { HistoryService } from './history.service';
import { EventsService } from './events.service';
import { ResourceAssignmentsService } from './resource_assignments.service';
import {
  weekdayFromLuxon,
  buildIntervalsForDay,
  isWithinAnyInterval,
  nextStartAfter,
} from '../core/time_utils';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../../common/constants';
import { FiltersDto } from '../dto/filters.dto';
import { FindAllResultInterface } from '../interfaces/findall-result.interface';
import { ScheduledTaskProcessBootstrapService } from '../../automation/scheduled-task-process-bootstrap.service';

/**
 * SchedulerService:
 * - Fits requested windows into calendars (tenant and/or user)
 * - Applies dependency gates
 * - Prevents overlaps for serial shifts
 * - Enqueues BullMQ jobs for start/end with idempotency tokens
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue('task-scheduler') private readonly queue: Queue,
    @Inject(CALENDAR_PROVIDER) private readonly calendar: CalendarProvider,
    @Inject(TASK_CONTEXT_PROVIDER)
    private readonly taskCtx: TaskContextProvider,
    private readonly deps: DependencyResolverService,
    private readonly scheduledTasks: ScheduledTasksService,
    private readonly history: HistoryService,
    private readonly events: EventsService,
    private readonly resourceAssignments: ResourceAssignmentsService,

    @InjectRepository(ScheduledTaskEntity)
    private readonly schedRepo: Repository<ScheduledTaskEntity>,
    @InjectRepository(ResourceAssignmentShiftEntity)
    private readonly shiftRepo: Repository<ResourceAssignmentShiftEntity>,
    private readonly scheduledTaskProcess: ScheduledTaskProcessBootstrapService,
  ) {}

  /* ---------- time helpers ---------- */

  private async nextAllowedUtc(
    tenantId: number,
    tenantUserId: number | null,
    requestedUtc: Date,
    tz: string,
  ): Promise<Date> {
    console.log(requestedUtc, 'requestedUtc');
    let cursor = DateTime.fromJSDate(requestedUtc, { zone: 'utc' }).setZone(tz);
    for (let i = 0; i < 366; i++) {
      const dateStr = cursor.toISODate();
      const isOff = await this.calendar.isOffDateLocal(
        tenantId,
        tenantUserId ?? undefined,
        dateStr ? dateStr : '',
      );
      const weekday = weekdayFromLuxon(cursor);
      const slots = isOff
        ? []
        : await this.calendar.getWorkingIntervalsLocal(
            tenantId,
            tenantUserId ?? undefined,
            dateStr ? dateStr : '',
            weekday,
          );
      const intervals = buildIntervalsForDay(cursor, slots);
      if (intervals.length) {
        if (isWithinAnyInterval(cursor, intervals))
          return cursor.setZone('utc').toJSDate();
        const nxt = nextStartAfter(cursor, intervals);
        if (nxt) return nxt.setZone('utc').toJSDate();
      }
      cursor = cursor.plus({ days: 1 }).startOf('day');
    }
    return DateTime.fromJSDate(requestedUtc, { zone: 'utc' }).toJSDate();
  }

  private async addDurationWithinWorkingHours(
    tenantId: number,
    tenantUserId: number | null,
    startUtc: Date,
    durationMs: number,
    tz: string,
  ): Promise<Date> {
    if (durationMs <= 0) return startUtc;

    let pointerLocal = DateTime.fromJSDate(startUtc, { zone: 'utc' }).setZone(
      tz,
    );
    let remaining = durationMs;

    for (let i = 0; i < 366 && remaining > 0; i++) {
      const dayStart = pointerLocal.startOf('day');
      const dateStr = pointerLocal.toISODate();
      const isOff = await this.calendar.isOffDateLocal(
        tenantId,
        tenantUserId ?? undefined,
        dateStr ? dateStr : '',
      );
      const weekday = weekdayFromLuxon(pointerLocal);
      const slots = isOff
        ? []
        : await this.calendar.getWorkingIntervalsLocal(
            tenantId,
            tenantUserId ?? undefined,
            dateStr ? dateStr : '',
            weekday,
          );
      const intervals = buildIntervalsForDay(pointerLocal, slots);

      if (intervals.length) {
        for (const interval of intervals) {
          const intervalStart = interval.start;
          const intervalEnd = interval.end;
          if (!intervalStart || !intervalEnd) continue;

          const usableStart =
            pointerLocal > intervalStart ? pointerLocal : intervalStart;
          if (usableStart >= intervalEnd) continue;

          const available = intervalEnd.diff(
            usableStart,
            'milliseconds',
          ).milliseconds;
          if (available >= remaining) {
            const finishLocal = usableStart.plus({ milliseconds: remaining });
            return finishLocal.setZone('utc').toJSDate();
          }

          remaining -= available;
          pointerLocal = intervalEnd;
        }
      }

      pointerLocal = dayStart.plus({ days: 1 });
    }

    return DateTime.fromJSDate(startUtc, { zone: 'utc' })
      .plus({ milliseconds: durationMs })
      .toJSDate();
  }

  private msUntil(d: Date): number {
    return Math.max(0, DateTime.fromJSDate(d).diffNow().milliseconds);
  }

  /**
   * Schedules a parent window (no assignee) for a task after applying
   * dependency and calendar constraints.
   * @param userId - ID of the user initiating the schedule.
   * @param input - Window request payload.
   * @returns Scheduled window details (ids and effective times).
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
    },
  ) {
    const ctx = await this.taskCtx.getTaskContext(input.taskId);
    const { tenantId, taskStatusId, assigneeId } = ctx;

    // Dependency gate
    const depGate = await this.deps.earliestGateUtc(input.taskId);

    // Requested window adjusted by dependencies / constraints
    let reqStart = DateTime.fromJSDate(input.requestedStartUtc);
    let reqEnd = DateTime.fromJSDate(input.requestedEndUtc);

    if (depGate) {
      const g = DateTime.fromJSDate(depGate);
      if (reqStart < g) reqStart = g;
      if (reqEnd < reqStart) reqEnd = reqStart.plus({ minutes: 1 });
    }

    if (ctx.startConstraintType && ctx.startConstraintUtc) {
      const c = DateTime.fromJSDate(ctx.startConstraintUtc);
      switch (ctx.startConstraintType) {
        case 'NoEarlierThan':
          if (reqStart < c) reqStart = c;
          break;
        case 'On':
          reqStart = c;
          break;
        case 'MustStartOn':
          reqStart = c;
          break;
        case 'NoLaterThan':
          /* keep reqStart; validation can warn */ break;
        case 'MustFinishOn':
          reqEnd = DateTime.fromJSDate(
            ctx.finishConstraintUtc ?? reqEnd.toJSDate(),
          );
          if (reqStart > reqEnd) reqStart = reqEnd.minus({ minutes: 1 });
          break;
        case 'ASAP':
        default:
          break;
      }
    }

    // Fit to tenant calendar
    const tz = await this.calendar.getTimezone(tenantId);
    const effStart = await this.nextAllowedUtc(
      tenantId,
      null,
      reqStart.toJSDate(),
      tz,
    );
    const requestedDurationMs = Math.max(
      0,
      reqEnd.diff(reqStart, 'milliseconds').milliseconds,
    );
    const effEnd = await this.addDurationWithinWorkingHours(
      tenantId,
      null,
      effStart,
      requestedDurationMs,
      tz,
    );

    const effectiveEnd = DateTime.max(
      DateTime.fromJSDate(effStart),
      DateTime.fromJSDate(effEnd),
    ).toJSDate();

    // Create active scheduled row (parent: no assignee)
    const row = await this.scheduledTasks.createActive({
      parentScheduledTaskId: input.parentScheduledTaskId ?? null,
      tenantId,
      tenantUserId: null,
      taskId: input.taskId,
      taskStatusId: taskStatusId,
      requestedStartUtc: reqStart.toJSDate(),
      requestedEndUtc: reqEnd.toJSDate(),
      effectiveStartUtc: effStart,
      effectiveEndUtc: effectiveEnd,
      tzUsed: tz,
      dependencyGateUtc: depGate ?? null,
      priority: input.priority ?? 0,
      startJobToken: randomUUID(),
      endJobToken: randomUUID(),
      blockReason: 'none',
      startAttempts: 0,
      endAttempts: 0,
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
    };
  }

  /**
   * Schedules serial child shifts for a task, enforcing non-overlap and
   * fitting each child to the assignee's calendar.
   * @param userId - ID of the user initiating the schedule.
   * @param input - Shifts request payload.
   * @returns Array of created shift/schedule mappings and effective times.
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
    if (!input.shifts?.length)
      throw new BadRequestException('No shifts provided');

    // Validate resource assignments exist
    const assignmentIds = input.shifts.map((s) => s.resourceAssignmentId);
    await this.resourceAssignments.validateExistence(assignmentIds);

    const ctx = await this.taskCtx.getTaskContext(input.taskId);
    const { tenantId, taskStatusId, assigneeId } = ctx;
    const ordered = [...input.shifts].sort(
      (a, b) => (a.sequenceNo ?? 1) - (b.sequenceNo ?? 1),
    );

    // Serialize plan (no overlaps between consecutive items in the requested plan)
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

    const created: Array<{
      shiftId: number;
      scheduledTaskId: number;
      effectiveStartUtc: Date;
      effectiveEndUtc: Date;
    }> = [];
    let prevChildEndUtc: Date | null = null;

    for (const s of ordered) {
      const seq = s.sequenceNo ?? 1;

      // Persist the shift (set scalar fields directly)
      const shift = this.shiftRepo.create({
        resourceAssignmentId: s.resourceAssignmentId,
        tenantUserId: s.tenantUserId,
        sequenceNo: seq,
        plannedStartUtc: s.plannedStartUtc,
        plannedEndUtc: s.plannedEndUtc,
        status: 'planned',
      });

      const savedShift = await this.shiftRepo.save(shift);

      // Respect serial (child can't start before previous child ended)
      const serialStart =
        prevChildEndUtc &&
        DateTime.fromJSDate(s.plannedStartUtc) <
          DateTime.fromJSDate(prevChildEndUtc)
          ? prevChildEndUtc
          : s.plannedStartUtc;

      // Fit to user calendar
      const tz = await this.calendar.getTimezone(tenantId, s.tenantUserId);
      const effStart = await this.nextAllowedUtc(
        tenantId,
        s.tenantUserId,
        serialStart,
        tz,
      );

      console.log(effStart, 'effStart');
      console.log(serialStart, 'serialStart');
      const plannedDurationMs = Math.max(
        0,
        DateTime.fromJSDate(s.plannedEndUtc).diff(
          DateTime.fromJSDate(s.plannedStartUtc),
          'milliseconds',
        ).milliseconds,
      );
      const effEndCandidate = await this.addDurationWithinWorkingHours(
        tenantId,
        s.tenantUserId,
        effStart,
        plannedDurationMs,
        tz,
      );
      let effEnd = DateTime.max(
        DateTime.fromJSDate(effStart),
        DateTime.fromJSDate(effEndCandidate),
      ).toJSDate();

      console.log(effEnd, 'effEnd');

      // Prevent conflicts with user's other active schedules
      const conflicts = await this.scheduledTasks.findUserOverlaps(
        s.tenantUserId,
        effStart,
        effEnd,
      );
      if (conflicts.length) {
        const maxEnd = conflicts.reduce(
          (m, r) => (r.effectiveEndUtc > m ? r.effectiveEndUtc : m),
          effStart,
        );
        const pushedStart = DateTime.fromJSDate(maxEnd)
          .plus({ minutes: 1 })
          .toJSDate();
        const pushedEffStart = await this.nextAllowedUtc(
          tenantId,
          s.tenantUserId,
          pushedStart,
          tz,
        );
        const pushedEffEnd = await this.addDurationWithinWorkingHours(
          tenantId,
          s.tenantUserId,
          pushedEffStart,
          plannedDurationMs,
          tz,
        );
        effEnd = DateTime.max(
          DateTime.fromJSDate(pushedEffStart),
          DateTime.fromJSDate(pushedEffEnd),
        ).toJSDate();

        const sameTaskConf = await this.scheduledTasks.findTaskChildOverlaps(
          input.taskId,
          pushedEffStart,
          effEnd,
        );
        if (sameTaskConf.length) {
          throw new BadRequestException(
            'Same-task child overlap after push; adjust shifts or durations.',
          );
        }
        (s as any).__effStart = pushedEffStart;
        (s as any).__effEnd = effEnd;
      } else {
        (s as any).__effStart = effStart;
        (s as any).__effEnd = effEnd;
      }

      // Create child schedule row (assignee set)
      const row = await this.scheduledTasks.createActive({
        parentScheduledTaskId: input.parentScheduledTaskId ?? null,
        tenantId,
        tenantUserId: s.tenantUserId,
        taskId: input.taskId,
        taskStatusId: taskStatusId,
        requestedStartUtc: s.plannedStartUtc,
        requestedEndUtc: s.plannedEndUtc,
        effectiveStartUtc: (s as any).__effStart,
        effectiveEndUtc: (s as any).__effEnd,
        tzUsed: tz,
        dependencyGateUtc: null,
        priority: input.priority ?? 0,
        startJobToken: randomUUID(),
        endJobToken: randomUUID(),
        blockReason: 'none',
        startAttempts: 0,
        endAttempts: 0,
      } as Partial<ScheduledTaskEntity>);

      // Link shift → scheduled task by setting the FK directly
      savedShift.scheduledTaskId = row.scheduledTaskId;
      await this.shiftRepo.save(savedShift);

      await this.history.snapshot(row);

      // Enqueue start/end
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
        shiftId: savedShift.shiftId,
        scheduledTaskId: row.scheduledTaskId,
        effectiveStartUtc: row.effectiveStartUtc,
        effectiveEndUtc: row.effectiveEndUtc,
      });
      prevChildEndUtc = row.effectiveEndUtc;
    }

    return { created };
  }

  /**
   * Retrieves active schedules in a tenant scope with paging and sorting.
   * @param userId - ID of the user requesting the data.
   * @param params - Tenant scope and pagination/sort options.
   * @returns Paged list of schedules.
   */
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
      items: items,
      scheduledTaskRecords: items,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves active schedules for a task in a tenant scope.
   * @param userId - ID of the user requesting the data.
   * @param params - Tenant/task scope with pagination.
   * @returns Paged list of schedules.
   */
  async findAllByTask(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery({ ...filtersDto, search: undefined });
    if (filtersDto.taskId) {
      (findQuery.where as any).taskId = filtersDto.taskId;
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
      items: items,
      scheduledTaskRecords: items,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a schedule by ID.
   * @param userId - ID of the user requesting the data.
   * @param scheduledTaskId - Scheduled row ID.
   * @returns The schedule row or null if not found.
   */
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

  /**
   * Reschedules an active row, fitting requested times to the relevant calendar.
   * @param userId - ID of the user updating the schedule.
   * @param input - Reschedule request payload.
   * @returns New effective times.
   */
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
    if (!row) throw new BadRequestException('Scheduled task not found');

    // Fit to calendar (tenant or tenant_user)
    const tenantId = row.tenantId!;
    const tz = await this.calendar.getTimezone(
      tenantId,
      row.tenantUserId ?? undefined,
    );
    const effStart = await this.nextAllowedUtc(
      tenantId,
      row.tenantUserId ?? null,
      input.requestedStartUtc,
      tz,
    );
    const effEndCandidate = await this.nextAllowedUtc(
      tenantId,
      row.tenantUserId ?? null,
      input.requestedEndUtc,
      tz,
    );
    const effEnd = DateTime.max(
      DateTime.fromJSDate(effStart),
      DateTime.fromJSDate(effEndCandidate),
    ).toJSDate();

    row.requestedStartUtc = input.requestedStartUtc;
    row.requestedEndUtc = input.requestedEndUtc;
    row.effectiveStartUtc = effStart;
    row.effectiveEndUtc = effEnd;
    row.updatedAt = new Date();
    await this.schedRepo.save(row);
    await this.history.snapshot(row);
    return {
      scheduledTaskId: row.scheduledTaskId,
      effectiveStartUtc: row.effectiveStartUtc,
      effectiveEndUtc: row.effectiveEndUtc,
    };
  }

  /**
   * Pauses an active schedule until a specified UTC time.
   * @param userId - ID of the user pausing the schedule.
   * @param input - Pause request payload.
   * @returns Confirmation with pause-until time.
   */
  async pause(
    userId: number,
    input: { scheduledTaskId: number; pausedUntilUtc: Date },
  ) {
    const row = await this.schedRepo.findOne({
      where: { scheduledTaskId: input.scheduledTaskId },
    });
    if (!row) throw new BadRequestException('Scheduled task not found');
    await this.scheduledTasks.pauseUntil(
      row.scheduledTaskId,
      input.pausedUntilUtc,
      'calendar',
    );
    return { paused: true, until: input.pausedUntilUtc };
  }

  /**
   * Resumes a paused schedule.
   * @param userId - ID of the user resuming the schedule.
   * @param input - Resume request payload.
   * @returns Confirmation of resume.
   */
  async resume(userId: number, input: { scheduledTaskId: number }) {
    const row = await this.schedRepo.findOne({
      where: { scheduledTaskId: input.scheduledTaskId },
    });
    if (!row) throw new BadRequestException('Scheduled task not found');
    await this.scheduledTasks.resume(row.scheduledTaskId);
    return { resumed: true };
  }

  /**
   * Cancels an active schedule.
   * @param userId - ID of the user cancelling the schedule.
   * @param input - Cancel request payload.
   * @returns Confirmation of cancellation.
   */
  async cancel(userId: number, input: { scheduledTaskId: number }) {
    const row = await this.schedRepo.findOne({
      where: { scheduledTaskId: input.scheduledTaskId },
    });
    if (!row) throw new BadRequestException('Scheduled task not found');
    row.status = 'cancelled' as any;
    row.isActive = 0 as any;
    row.updatedAt = new Date();
    await this.schedRepo.save(row);
    await this.history.snapshot(row);
    return { cancelled: true };
  }

  /**
   * Builds a TypeORM find query for scheduled tasks with relations/filters/sort/paging.
   * @private
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    query.where = { tenantId: filtersDto.tenantId, isActive: 1 } as any;

    if (filtersDto.search) {
      // Placeholder for future text search on columns
    }

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

  /**
   * Builds pagination structure matching project services.
   * @private
   */
  private buildPagination(
    filtersDto: any,
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
