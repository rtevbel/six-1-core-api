import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Worker, Processor, Job } from 'bullmq';
import { StepOrchestratorService } from './step-orchestrator.service';

@Injectable()
export class AutomationQueueWorker implements OnModuleDestroy {
  private readonly worker: Worker;

  constructor(private readonly orchestrator: StepOrchestratorService) {
    const connection = {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: +(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    };

    const queueName = process.env.AUTOMATION_QUEUE ?? 'automation';

    const processor: Processor = async (job: Job) => {
      if (job.name === 'time-trigger') {
        const ctx = job.data?.context;
        const stepId = ctx?.step?.id;
        if (stepId) {
          await this.orchestrator.attemptAdvance(stepId, {
            cause: 'timer',
            correlationId: ctx?.correlationId,
          });
        }
        return;
      }
      if (job.name.startsWith('notifications:')) {
        // call notification logic here using job.data
        return;
      }
    };

    this.worker = new Worker(queueName, processor, {
      connection,
      concurrency: +(process.env.AUTOMATION_WORKER_CONCURRENCY ?? 10),
    });

    this.worker.on('error', (err: Error) =>
      console.error('[BullMQ][worker][error]', err),
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
