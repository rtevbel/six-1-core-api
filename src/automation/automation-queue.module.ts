import { Module } from '@nestjs/common';
import { BullMqSchedulerAdapter } from './bullmq.scheduler';
import { AutomationQueueWorker } from './bullmq.worker';
import { SCHEDULER_PORT } from './scheduler.port';
import { StepOrchestratorService } from './step-orchestrator.service';
import { TriggerEngineService } from './trigger-engine.service';
import { AutomationEventBridgeListener } from './automation-event-bridge.listener';
import { EventsService } from '../events/events.service';

/**
 * AutomationQueueModule is a NestJS module that sets up the automation queue system.
 * It provides services for scheduling, event handling, and step orchestration.
 */
@Module({
  providers: [
    // Core services required for automation functionality
    StepOrchestratorService, // Handles step orchestration logic
    TriggerEngineService, // Manages trigger evaluation and execution
    EventsService, // Handles domain events for the system

    // Scheduler binding
    BullMqSchedulerAdapter, // Adapter for BullMQ-based scheduling
    { provide: SCHEDULER_PORT, useExisting: BullMqSchedulerAdapter }, // Expose the scheduler port using the adapter

    // Worker and event listeners
    AutomationQueueWorker, // Worker for processing automation queue jobs
    AutomationEventBridgeListener, // Listener for handling automation-related events
  ],
  exports: [
    // Export the scheduler port to make it available to other modules
    { provide: SCHEDULER_PORT, useExisting: BullMqSchedulerAdapter },
  ],
})
export class AutomationQueueModule {}
