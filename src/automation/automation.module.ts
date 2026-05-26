// src/automation/automation.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import { ProcessLifecycleFacade } from './process-lifecycle.facade';
import { ProcessHostRegistry } from './process-host/process-host.registry';
import { ProjectHostAdapter } from './process-host/project-host.adapter';
import { ConfigurableInstanceHostAdapter } from './process-host/configurable-instance-host.adapter';
import { GenericWorkflowHostAdapter } from './process-host/generic-workflow-host.adapter';
import { ConfigCustomObjectInstanceEntity } from '../config_objects/entities/config_custom_object_instance.entity';
import { ConfigObjectsModule } from '../config_objects/config_objects.module';
import { EventsModule } from '../events/events.module';
import { ConfigObjectStepExecutor } from './config-object-step-executor.service';
import { ChildProcessOrchestrationService } from './child-process-orchestration.service';
import { ScheduledTaskHostAdapter } from './process-host/scheduled-task-host.adapter';
import { ScheduledTaskProcessBootstrapService } from './scheduled-task-process-bootstrap.service';
import { ProcessCompletionService } from './process-completion.service';

@Module({
  imports: [
    AjvModule,
    EventsModule,
    ConfigObjectsModule,
    TypeOrmModule.forFeature([ConfigCustomObjectInstanceEntity]),
  ],
  providers: [
    ProcessFeatureFlagsService,
    // events layer
    EventCatalogService,
    // automation core
    RequirementValidationService,
    TriggerEngineService,
    StepOrchestratorService,
    ProcessInstantiationService,
    ProjectHostAdapter,
    ScheduledTaskHostAdapter,
    ConfigurableInstanceHostAdapter,
    GenericWorkflowHostAdapter,
    ProcessHostRegistry,
    ProcessLifecycleFacade,
    ConfigObjectStepExecutor,
    ChildProcessOrchestrationService,
    ScheduledTaskProcessBootstrapService,
    ProcessCompletionService,
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
    ProcessFeatureFlagsService,
    ProcessLifecycleFacade,
    ProcessHostRegistry,
    ConfigObjectStepExecutor,
    ChildProcessOrchestrationService,
    ScheduledTaskProcessBootstrapService,
    ProcessCompletionService,
  ],
})
export class AutomationModule {}
