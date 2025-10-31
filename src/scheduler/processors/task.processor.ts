import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { Inject } from '@nestjs/common';

import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';
import { ScheduledTasksService } from '../services/scheduled_tasks.service';
import { EventsService } from '../services/events.service';
import { CalendarProvider } from '../core/interfaces';
import { CALENDAR_PROVIDER } from '../constants';
import {
  weekdayFromLuxon,
  buildIntervalsForDay,
  isWithinAnyInterval,
  nextStartAfter,
} from '../core/time_utils';

/**
 * Worker guarantees:
 * - Idempotent via start/end tokens
 * - If calendar is closed at run time, defers the job to the next valid slot (and pauses schedule)
 */
@Processor('task-scheduler')
export class TaskProcessor extends WorkerHost {
  constructor(
    @InjectRepository(ScheduledTaskEntity)
    private readonly repo: Repository<ScheduledTaskEntity>,
    private readonly scheduled: ScheduledTasksService,
    private readonly events: EventsService,
    @Inject(CALENDAR_PROVIDER) private readonly calendar: CalendarProvider,

    // ⬇️ Inject the same queue used by the service
    @InjectQueue('task-scheduler')
    private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name === 'task.start') return this.handleStart(job);
    if (job.name === 'task.end')   return this.handleEnd(job);
  }

  private async handleStart(job: Job) {
    const { scheduledTaskId, token } = job.data as { scheduledTaskId: number; token: string };
    const row = await this.repo.findOne({ where: { scheduledTaskId } });
    if (!row || row.isActive === 0 || row.startJobToken !== token) return; // idempotent no-op

    // Only enforce calendar for child rows with a user
    if (row.tenantUserId) {
      const tz = row.tzUsed || 'UTC';
      const nowLocal = DateTime.now().setZone(tz);
      const isoDate = nowLocal.toISODate()!;
      const weekday = weekdayFromLuxon(nowLocal);

      const isOff = await this.calendar.isOffDateLocal(row.tenantId, row.tenantUserId, isoDate);
      const slots = isOff ? [] : await this.calendar.getWorkingIntervalsLocal(row.tenantId, row.tenantUserId, isoDate, weekday);
      const intervals = buildIntervalsForDay(nowLocal, slots);

      if (!isWithinAnyInterval(nowLocal, intervals)) {
        // Defer to next interval start (or next day start if none today)
        const next = nextStartAfter(nowLocal, intervals);
        const nextUtc: Date = (next ?? nowLocal.plus({ days: 1 }).startOf('day')).setZone('utc').toJSDate();

        await this.scheduled.pauseUntil(row.scheduledTaskId, nextUtc, 'calendar');
        await this.events.emit(row.scheduledTaskId, 'deferred', { reason: 'calendar', nextUtc });

        // Requeue using injected queue (NOT job.queue)
        await this.queue.add(
          'task.start',
          { scheduledTaskId, token },
          {
            jobId: token, // idempotent re-enqueue
            delay: Math.max(0, DateTime.fromJSDate(nextUtc).diffNow().milliseconds),
            attempts: 5,
            backoff: { type: 'exponential', delay: 60_000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
        return;
      }
    }

    await this.scheduled.markRunning(row.scheduledTaskId, new Date());
    await this.events.emit(row.scheduledTaskId, 'run_start', { jobId: job.id });
  }

  private async handleEnd(job: Job) {
    const { scheduledTaskId, token } = job.data as { scheduledTaskId: number; token: string };
    const row = await this.repo.findOne({ where: { scheduledTaskId } });
    if (!row || row.isActive === 0 || row.endJobToken !== token) return; // idempotent no-op

    await this.scheduled.markCompleted(row.scheduledTaskId, new Date());
    await this.events.emit(row.scheduledTaskId, 'run_end', { jobId: job.id });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, err: Error) {
    if (!job) return;
    const id = (job.data && job.data.scheduledTaskId) as number | undefined;
    if (!id) return;
    await this.repo.update(
      { scheduledTaskId: id },
      { lastError: err?.message ?? 'failed', status: 'failed' },
    );
    await this.events.emit(id, 'failed', { reason: err?.message, name: job.name });
  }
}
