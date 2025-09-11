// src/automation/bullmq.worker.ts

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Worker, Processor } from 'bullmq';
import IORedis from 'ioredis';
import { StepOrchestratorService } from './step-orchestrator.service';

/**
 * AutomationQueueWorker is responsible for processing jobs from the automation queue.
 * It uses BullMQ's Worker to handle job execution and delegates specific tasks to the StepOrchestratorService.
 */
@Injectable()
export class AutomationQueueWorker implements OnModuleDestroy {
  private readonly worker: Worker; // BullMQ Worker instance for processing jobs

  /**
   * Constructor initializes the worker and sets up the job processor.
   * 
   * @param orchestrator - The StepOrchestratorService used to handle specific job types.
   */
  constructor(private readonly orchestrator: StepOrchestratorService) {
    // Initialize Redis connection with configuration from environment variables
    const connection = new IORedis({
      host: process.env.REDIS_HOST ?? '127.0.0.1', // Redis host (default: localhost)
      port: +(process.env.REDIS_PORT ?? 6379), // Redis port (default: 6379)
      password: process.env.REDIS_PASSWORD || undefined, // Redis password (optional)
      maxRetriesPerRequest: null, // Disable retry limit for requests
      enableReadyCheck: true, // Enable Redis ready check
    });

    // Define the queue name from environment variables or use a default value
    const queueName = process.env.AUTOMATION_QUEUE ?? 'automation';

    // Define the processor function to handle jobs from the queue
    const processor: Processor = async (job) => {
      // Handle "time-trigger" jobs
      if (job.name === 'time-trigger') {
        const ctx = job.data?.context; // Extract context from job data
        const stepId = ctx?.step?.id; // Extract step ID from context
        if (stepId) {
          // Attempt to advance the step using the orchestrator
          await this.orchestrator.attemptAdvance(stepId, { cause: 'timer', correlationId: ctx?.correlationId });
        }
        return;
      }

      // Handle "notifications" jobs (e.g., jobs with names starting with "notifications:")
      if (job.name.startsWith('notifications:')) {
        // Call your notification app/service here with job.data
        return;
      }

      // Handle unknown or unsupported job types (optional logging)
      // console.log('[AutomationQueueWorker] Unknown job', job.name);
    };

    // Initialize the BullMQ Worker with the queue name, processor, and configuration
    this.worker = new Worker(queueName, processor, {
      connection, // Redis connection
      concurrency: +(process.env.AUTOMATION_WORKER_CONCURRENCY ?? 10), // Worker concurrency (default: 10)
    });

    // Log worker errors
    this.worker.on('error', (err) => console.error('[BullMQ][worker][error]', err));
  }

  /**
   * Cleans up resources when the module is destroyed.
   * Closes the worker to stop processing jobs.
   */
  async onModuleDestroy() {
    await this.worker?.close(); // Close the worker gracefully
  }
}