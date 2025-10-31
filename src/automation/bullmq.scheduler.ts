import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, JobsOptions, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { SchedulerPort } from './scheduler.port';

@Injectable()
export class BullMqSchedulerAdapter implements SchedulerPort, OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly queue: Queue;
  private readonly queueEvents: QueueEvents;

  constructor() {
    this.connection = new IORedis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: +(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });

    const queueName = process.env.AUTOMATION_QUEUE ?? 'automation';
    this.queue = new Queue(queueName, { connection: this.connection });
    this.queueEvents = new QueueEvents(queueName, {
      connection: this.connection,
    });

    this.queueEvents.on('failed', (e) => console.error('[BullMQ][failed]', e));
    this.queueEvents.on('error', (e) => console.error('[BullMQ][error]', e));
  }

  async schedule(delayMs: number, jobName: string, data: any): Promise<void> {
    const opts: JobsOptions = {
      delay: Math.max(0, delayMs || 0),
      removeOnComplete: 1000,
      removeOnFail: 1000,
      attempts: 1,
    };
    await this.queue.add(jobName, data, opts);
  }

  async onModuleDestroy() {
    await Promise.allSettled([
      this.queue.close(),
      this.queueEvents.close(),
      this.connection.quit(),
    ]);
  }
}
