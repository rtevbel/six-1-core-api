// src/scheduler/services/scheduler.service.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DateTime } from 'luxon';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CALENDAR_PROVIDER, CalendarProvider,
  TASK_CONTEXT_PROVIDER, TaskContextProvider,
} from '../core/interfaces';
import {
  weekdayFromLuxon, buildIntervalsForDay, isWithinAnyInterval, nextStartAfter,
} from '../core/time_utils';
import { DependencyResolverService } from './dependency_resolver.service';
import { ScheduledTasksService } from './scheduled_tasks.service';
import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';
import { HistoryService } from './history.service';
import { EventsService } from './events.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue('task-scheduler') private readonly queue: Queue, // Inject the BullMQ queue for task scheduling
    @Inject(CALENDAR_PROVIDER) private readonly calendar: CalendarProvider, // Inject the calendar provider for time-related operations
    @Inject(TASK_CONTEXT_PROVIDER) private readonly taskCtx: TaskContextProvider, // Inject the task context provider for task metadata
    private readonly deps: DependencyResolverService, // Service to compute task dependencies
    private readonly scheduledTasks: ScheduledTasksService, // Service to manage scheduled tasks
    private readonly history: HistoryService, // Service to manage task history snapshots
    private readonly events: EventsService, // Service to emit task-related events
    @InjectRepository(ScheduledTaskEntity) private readonly schedRepo: Repository<ScheduledTaskEntity>, // TypeORM repository for scheduled tasks
  ) {}

  /**
   * Schedule a task window with requested start and end times.
   * This method computes dependencies, validates against the calendar, and enqueues start/end jobs.
   */
  async scheduleTaskWindow(input: {
    taskId: number;
    taskStatusId: number;
    requestedStartUtc: Date;
    requestedEndUtc: Date;
    priority?: number;
    createdBy?: number | null;
  }) {
    // Retrieve tenant and user context for the task
    const { tenantId, tenantUserId } = await this.taskCtx.getTaskContext(input.taskId);

    // Compute task dependencies and determine gated start and end times
    const dep = await this.deps.computeConstraints(input.taskId);
    const startCandidate = DateTime.fromJSDate(input.requestedStartUtc, { zone: 'utc' });
    const endCandidate = DateTime.fromJSDate(input.requestedEndUtc, { zone: 'utc' });

    const gatedStart = dep.earliestStartUtc
      ? DateTime.max(startCandidate, DateTime.fromJSDate(dep.earliestStartUtc, { zone: 'utc' }))
      : startCandidate;

    const gatedEnd = dep.earliestFinishUtc
      ? DateTime.max(endCandidate, DateTime.fromJSDate(dep.earliestFinishUtc, { zone: 'utc' }))
      : endCandidate;

    const depGateUtc = (dep.earliestStartUtc || dep.earliestFinishUtc)
      ? DateTime.max(
          dep.earliestStartUtc ? DateTime.fromJSDate(dep.earliestStartUtc, { zone: 'utc' }) : gatedStart,
          dep.earliestFinishUtc ? DateTime.fromJSDate(dep.earliestFinishUtc, { zone: 'utc' }) : gatedEnd,
        ).toJSDate()
      : null;

    // Validate against the calendar and compute effective start and end times
    const tz = await this.calendar.getTimezone(tenantId, tenantUserId ?? undefined);
    const effectiveStartUtc = await this.nextAllowedUtc(tenantId, tenantUserId, gatedStart.toJSDate(), tz);
    const effectiveEndUtc = await this.nextAllowedUtc(tenantId, tenantUserId, gatedEnd.toJSDate(), tz);
    const finalEndUtc = DateTime.max(
      DateTime.fromJSDate(effectiveEndUtc, { zone: 'utc' }),
      DateTime.fromJSDate(effectiveStartUtc, { zone: 'utc' }).plus({ minutes: 1 }),
    ).toJSDate();

    // Create snapshots for calendar and dependencies
    const calendarSnapshot = { tz, computedAt: new Date().toISOString() };
    const dependencySnapshot = dep.snapshot;

    // Create an active scheduled task row in the database
    const row = await this.scheduledTasks.createActive({
      tenantId, tenantUserId,
      taskId: input.taskId,
      taskStatusId: input.taskStatusId,
      requestedStartUtc: input.requestedStartUtc,
      requestedEndUtc: input.requestedEndUtc,
      effectiveStartUtc,
      effectiveEndUtc: finalEndUtc,
      tzUsed: tz,
      dependencyGateUtc: depGateUtc,
      blockedUntilUtc: null,
      blockReason: 'none',
      priority: input.priority ?? 0,
      startJobToken: randomUUID(),
      endJobToken: randomUUID(),
      startAttempts: 0,
      endAttempts: 0,
      lastError: null,
      calendarSnapshot,
      dependencySnapshot,
      createdBy: input.createdBy ?? null,
      updatedBy: input.createdBy ?? null,
    } as Partial<ScheduledTaskEntity>);

    // Save a snapshot of the task history
    await this.history.snapshot(row);

    // Enqueue start and end jobs with calculated delays
    const startDelay = Math.max(0, DateTime.fromJSDate(row.effectiveStartUtc, { zone: 'utc' }).diffNow().milliseconds);
    const endDelay = Math.max(0, DateTime.fromJSDate(row.effectiveEndUtc, { zone: 'utc' }).diffNow().milliseconds);

    const startJob = await this.queue.add('task.start',
      { scheduledTaskId: row.scheduledTaskId, taskId: row.taskId, token: row.startJobToken },
      { jobId: row.startJobToken!, delay: Math.round(startDelay), priority: row.priority,
        attempts: 5, backoff: { type: 'exponential', delay: 60_000 }, removeOnComplete: true, removeOnFail: false });

    const endJob = await this.queue.add('task.end',
      { scheduledTaskId: row.scheduledTaskId, taskId: row.taskId, token: row.endJobToken },
      { jobId: row.endJobToken!, delay: Math.round(endDelay), priority: row.priority,
        attempts: 5, backoff: { type: 'exponential', delay: 60_000 }, removeOnComplete: true, removeOnFail: false });

    // Update the task row with job IDs and status
    row.startJobId = String(startJob.id);
    row.endJobId = String(endJob.id);
    row.status = 'queued';
    await this.schedRepo.save(row);

    // Emit events for the enqueued jobs
    await this.events.emit(row.scheduledTaskId, 'enqueued_start', { at: row.effectiveStartUtc }, row.startJobId);
    await this.events.emit(row.scheduledTaskId, 'enqueued_end', { at: row.effectiveEndUtc }, row.endJobId);

    // Return the scheduled task details
    return {
      scheduledTaskId: row.scheduledTaskId,
      effectiveStartUtc: row.effectiveStartUtc,
      effectiveEndUtc: row.effectiveEndUtc,
      tzUsed: row.tzUsed,
    };
  }

  /**
   * Re-validate the calendar for the current time.
   * If the calendar is closed, compute the next allowed UTC time in the same timezone.
   */
async nextRunnableUtcOrNow(row: ScheduledTaskEntity): Promise<Date> {
    const tz = row.tzUsed || (await this.calendar.getTimezone(row.tenantId, row.tenantUserId ?? undefined));
    const tenantUserId = row.tenantUserId !== undefined ? row.tenantUserId : null;
    return this.nextAllowedUtc(row.tenantId, tenantUserId, new Date(), tz);
}

  /**
   * Compute the next allowed UTC time based on the calendar and working intervals.
   */
  private async nextAllowedUtc(tenantId: number, tenantUserId: number | null, requestedUtc: Date, tz: string): Promise<Date> {
    let cursorLocal = DateTime.fromJSDate(requestedUtc, { zone: 'utc' }).setZone(tz);
    for (let i = 0; i < 366; i++) { // Iterate up to 1 year to find the next allowed time
      const dateStr = cursorLocal.toISODate() || '';
      const isOff = await this.calendar.isOffDateLocal(tenantId, tenantUserId ?? undefined, dateStr);
      const weekday = weekdayFromLuxon(cursorLocal);
      const slots = isOff ? [] : await this.calendar.getWorkingIntervalsLocal(tenantId, tenantUserId ?? undefined, dateStr, weekday);
      const intervals = buildIntervalsForDay(cursorLocal, slots);

      if (intervals.length) {
        if (isWithinAnyInterval(cursorLocal, intervals)) return cursorLocal.setZone('utc').toJSDate();
        const nextStart = nextStartAfter(cursorLocal, intervals);
        if (nextStart) return nextStart.setZone('utc').toJSDate();
      }
      cursorLocal = cursorLocal.plus({ days: 1 }).startOf('day');
    }
    return DateTime.fromJSDate(requestedUtc, { zone: 'utc' }).toJSDate();
  }
}