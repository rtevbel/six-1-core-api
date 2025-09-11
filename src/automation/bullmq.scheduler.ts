import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, JobsOptions, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { SchedulerPort } from './scheduler.port';

/**
 * BullMqSchedulerAdapter is an implementation of the SchedulerPort interface.
 * It uses BullMQ to schedule jobs in a Redis-backed queue.
 * This class is also responsible for cleaning up resources when the module is destroyed.
 */
@Injectable()
export class BullMqSchedulerAdapter implements SchedulerPort, OnModuleDestroy {
  private readonly connection: IORedis; // Redis connection instance
  private readonly queue: Queue; // BullMQ queue instance for scheduling jobs
  private readonly queueEvents: QueueEvents; // BullMQ queue events instance for monitoring

  constructor() {
    // Initialize Redis connection with configuration from environment variables
    this.connection = new IORedis({
      host: process.env.REDIS_HOST ?? '127.0.0.1', // Redis host (default: localhost)
      port: +(process.env.REDIS_PORT ?? 6379), // Redis port (default: 6379)
      password: process.env.REDIS_PASSWORD || undefined, // Redis password (optional)
      maxRetriesPerRequest: null, // Disable retry limit for requests
      enableReadyCheck: true, // Enable Redis ready check
    });

    // Define the queue name from environment variables or use a default value
    const queueName = process.env.AUTOMATION_QUEUE ?? 'automation';

    // Initialize the BullMQ queue and queue events
    this.queue = new Queue(queueName, { connection: this.connection });
    this.queueEvents = new QueueEvents(queueName, { connection: this.connection });

    // Optional: Observe and log queue errors
    this.queueEvents.on('failed', (e) => console.error('[BullMQ][failed]', e));
    this.queueEvents.on('error', (e) => console.error('[BullMQ][error]', e));
  }

  /**
   * Schedules a job to be executed after a specified delay.
   * 
   * @param delayMs - The delay in milliseconds before the job is executed.
   * @param jobName - The name of the job to be scheduled.
   * @param data - Any additional data required for the job.
   */
  async schedule(delayMs: number, jobName: string, data: any): Promise<void> {
    const opts: JobsOptions = {
      delay: Math.max(0, delayMs || 0), // Ensure delay is non-negative
      removeOnComplete: 1000, // Automatically remove completed jobs after 1000 jobs
      removeOnFail: 1000, // Automatically remove failed jobs after 1000 jobs
      attempts: 1, // Number of retry attempts for the job
    };
    await this.queue.add(jobName, data, opts); // Add the job to the queue
  }

  /**
   * Cleans up resources when the module is destroyed.
   * Closes the queue, queue events, and Redis connection.
   */
  async onModuleDestroy() {
    await Promise.allSettled([
      this.queue.close(), // Close the BullMQ queue
      this.queueEvents.close(), // Close the BullMQ queue events
      this.connection.quit(), // Quit the Redis connection
    ]);
  }
}