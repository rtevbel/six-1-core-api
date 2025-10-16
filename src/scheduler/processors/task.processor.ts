import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';
import { SchedulerService } from '../services/scheduler.service';
import { EventsService } from '../services/events.service';
import { DateTime } from 'luxon';

// Define a processor for the 'task-scheduler' queue
@Processor('task-scheduler')
export class TaskProcessor extends WorkerHost{
 
 // Create a logger instance for this class
  private readonly logger = new Logger(TaskProcessor.name);

  // Inject dependencies via the constructor
  constructor(
    @InjectRepository(ScheduledTaskEntity) private readonly repo: Repository<ScheduledTaskEntity>, // Repository for accessing scheduled tasks
    private readonly scheduler: SchedulerService, // Service for scheduling tasks
    private readonly events: EventsService, // Service for emitting events
  ) {}

async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
        case 'task.start': {
            await this.onStart(job);
            break; // Prevent fallthrough
        }
        case 'task.end': {
            await this.onEnd(Job); // Call the defined function
            break;
        }
        default: {
            return true;
        }
    }
  }

  // Process the 'task.start' job
  async onStart(job: Job<{ scheduledTaskId: number; taskId: number; token: string }>) {
    // Fetch the scheduled task from the database
    const row = await this.repo.findOne({ where: { scheduledTaskId: job.data.scheduledTaskId } });
    if (!row) return; // Exit if the task does not exist

    // Ensure the token matches the active row and the task is active
    if (row.startJobToken !== job.data.token || row.isActive !== 1) return;

    // Determine the next runnable time for the task
    const next = await this.scheduler.nextRunnableUtcOrNow(row);
    const now = DateTime.utc();

    // If the task is not ready to run, defer it
    if (DateTime.fromJSDate(next, { zone: 'utc' }) > now.plus({ seconds: 1 })) {
      row.blockedUntilUtc = next;
      row.blockReason = 'calendar';
      row.status = 'paused';
      row.startAttempts = (row.startAttempts || 0) + 1;
      await this.repo.save(row);

      // Requeue the task with a delay
      const rejob = await job.queue.add('task.start',
        { scheduledTaskId: row.scheduledTaskId, taskId: row.taskId, token: row.startJobToken },
        { jobId: row.startJobToken!, delay: Math.max(0, DateTime.fromJSDate(next, { zone: 'utc' }).diffNow().milliseconds),
          priority: row.priority, attempts: 5, backoff: { type: 'exponential', delay: 60_000 } });

      // Emit an event indicating the task was deferred
      await this.events.emit(row.scheduledTaskId, 'deferred', { reason: 'calendar', until: next }, String(rejob.id));
      this.logger.log(`Deferred start for task ${row.taskId} to ${next.toISOString()}`);
      return;
    }

    // Mark the task as running and update its actual start time
    row.actualStartUtc = new Date();
    row.status = 'running';
    row.blockedUntilUtc = null;
    row.blockReason = 'none';
    await this.repo.save(row);

    // Emit an event indicating the task has started
    await this.events.emit(row.scheduledTaskId, 'run_start', { when: row.actualStartUtc }, job.id?.toString() ?? null);
    this.logger.log(`Started task ${row.taskId} (schedule ${row.scheduledTaskId})`);
  }

  // Process the 'task.end' job
  async onEnd(job: Job<{ scheduledTaskId: number; taskId: number; token: string }>) {
    // Fetch the scheduled task from the database
    const row = await this.repo.findOne({ where: { scheduledTaskId: job.data.scheduledTaskId } });
    if (!row) return; // Exit if the task does not exist

    // Ensure the token matches the active row and the task is active
    if (row.endJobToken !== job.data.token || row.isActive !== 1) return;

    // Determine the next runnable time for the task
    const next = await this.scheduler.nextRunnableUtcOrNow(row);
    const now = DateTime.utc();

    // If the task is not ready to end, defer it
    if (DateTime.fromJSDate(next, { zone: 'utc' }) > now.plus({ seconds: 1 })) {
      row.blockedUntilUtc = next;
      row.blockReason = 'calendar';
      row.status = 'paused';
      row.endAttempts = (row.endAttempts || 0) + 1;
      await this.repo.save(row);

      // Requeue the task with a delay
      const rejob = await job.queue.add('task.end',
        { scheduledTaskId: row.scheduledTaskId, taskId: row.taskId, token: row.endJobToken },
        { jobId: row.endJobToken!, delay: Math.max(0, DateTime.fromJSDate(next, { zone: 'utc' }).diffNow().milliseconds),
          priority: row.priority, attempts: 5, backoff: { type: 'exponential', delay: 60_000 } });

      // Emit an event indicating the task was deferred
      await this.events.emit(row.scheduledTaskId, 'deferred', { reason: 'calendar', until: next }, String(rejob.id));
      this.logger.log(`Deferred end for task ${row.taskId} to ${next.toISOString()}`);
      return;
    }

    // Mark the task as completed and update its actual end time
    row.actualEndUtc = new Date();
    row.status = 'completed';
    await this.repo.save(row);

    // Emit an event indicating the task has ended
    await this.events.emit(row.scheduledTaskId, 'run_end', { when: row.actualEndUtc }, job.id?.toString() ?? null);
    this.logger.log(`Completed task ${row.taskId} (schedule ${row.scheduledTaskId})`);
  }
}