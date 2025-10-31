// src/automation/automation.module.ts
import { Module } from '@nestjs/common';
import { AjvModule } from './ajv.module';
import { RequirementValidationService } from './requirement-validation.service';
import { TriggerEngineService } from './trigger-engine.service';
import { StepOrchestratorService } from './step-orchestrator.service';
import { ProcessInstantiationService } from './process-instantiation.service';
import { EventCatalogService } from '../events/event-catalog.service';
import { SCHEDULER_PORT } from './scheduler.port';
import { BullMqSchedulerAdapter } from './bullmq.scheduler';
import { AutomationQueueWorker } from './bullmq.worker';
import { AutomationEventBridgeListener } from './automation-event-bridge.listener';

@Module({
  imports: [AjvModule],
  providers: [
    // events layer
    EventCatalogService,
    // automation core
    RequirementValidationService,
    TriggerEngineService,
    StepOrchestratorService,
    ProcessInstantiationService,
    // scheduler + worker + bridge
    BullMqSchedulerAdapter,
    { provide: SCHEDULER_PORT, useExisting: BullMqSchedulerAdapter },
    AutomationQueueWorker,
    AutomationEventBridgeListener,
  ],
  exports: [
    RequirementValidationService,
    TriggerEngineService,
    StepOrchestratorService,
    ProcessInstantiationService,
  ],
})
export class AutomationModule {}
