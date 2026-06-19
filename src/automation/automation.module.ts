// src/automation/automation.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AjvModule } from './ajv.module';
import { RequirementValidationService } from './requirement-validation.service';
import { TriggerEngineService } from './trigger-engine.service';
import { StepOrchestratorService } from './step-orchestrator.service';
import { ProcessInstantiationService } from './process-instantiation.service';
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
import { SorEntityHostAdapter } from './process-host/sor-entity-host.adapter';
import { ConfigCustomObjectInstanceEntity } from '../config_objects/entities/config_custom_object_instance.entity';
import { ConfigObjectsModule } from '../config_objects/config_objects.module';
import { EventsModule } from '../events/events.module';
import { ConfigObjectStepExecutor } from './config-object-step-executor.service';
import { ChildProcessOrchestrationService } from './child-process-orchestration.service';
import { ScheduledTaskHostAdapter } from './process-host/scheduled-task-host.adapter';
import { ScheduledTaskProcessBootstrapService } from './scheduled-task-process-bootstrap.service';
import { ProcessCompletionService } from './process-completion.service';
import { AutomationEventHandlerService } from './automation-event-handler.service';
import { PlatformEventFlagsService } from '../events/config/platform-event-flags.service';
import { PlatformActionsModule } from '../events/platform-actions/platform-actions.module';
import { ProcessInstanceEntity } from '../process_instances/entities/process_instance.entity';
import { ProcessInstanceStepEntity } from '../process_instances/process_instance_steps/entities/process_instance_step.entity';
import { ProcessInstanceStepActionEntity } from '../process_instances/process_instance_steps/process_instance_step_actions/entities/process_instance_step_action.entity';
import { ProcessStepActionExecutorService } from './process-step-action-executor.service';
import { ProcessWebhookConfigService } from './config/process-webhook-config.service';
import { ProcessStepWebhookClient } from './process-step-webhook.client';
import { ProcessStepActionExecutionLogService } from './process-step-action-execution-log.service';
import { ProcessActionExecutionLogEntity } from '../process_instances/process_instance_steps/process_instance_step_actions/entities/process_action_execution_log.entity';

import { ProcessStartRulesModule } from '../process_start_rules/process_start_rules.module';
import { ProcessStartRuleEngineService } from './process-start-rules/process-start-rule-engine.service';
import { ProcessStartRuleDedupService } from './process-start-rules/process-start-rule-dedup.service';
import { ProcessStepActionOrchestrationService } from './process-step-action-orchestration.service';
import { ProcessStepExecutionLogService } from './process-step-execution-log.service';
import { ProcessStepExecutionLogEntity } from '../process_instances/entities/process_step_execution_log.entity';
import { ProcessInstanceStepAssigneeEntity } from '../process_instances/process_instance_steps/entities/process_instance_step_assignee.entity';
import { ProcessStepAssigneeService } from './process-step-assignee.service';
import { NotificationRulesModule } from '../events/notification-rules/notification-rules.module';
import { ProcessStepAssigneeResolverService } from './process-step-assignee-resolver.service';
import { ProcessStepExtensionEvaluatorService } from './process-step-extension-evaluator.service';
import { ProcessStepFailureService } from './process-step-failure.service';

@Module({
  imports: [
    AjvModule,
    forwardRef(() => EventsModule),
    forwardRef(() => ConfigObjectsModule),
    forwardRef(() => PlatformActionsModule),
    NotificationRulesModule,
    ProcessStartRulesModule,
    TypeOrmModule.forFeature([
      ConfigCustomObjectInstanceEntity,
      ProcessInstanceEntity,
      ProcessInstanceStepEntity,
      ProcessInstanceStepActionEntity,
      ProcessActionExecutionLogEntity,
      ProcessStepExecutionLogEntity,
      ProcessInstanceStepAssigneeEntity,
    ]),
  ],
  providers: [
    ProcessFeatureFlagsService,
    ProcessWebhookConfigService,
    PlatformEventFlagsService,
    AutomationEventHandlerService,
    // automation core
    RequirementValidationService,
    TriggerEngineService,
    StepOrchestratorService,
    ProcessInstantiationService,
    ProjectHostAdapter,
    ScheduledTaskHostAdapter,
    ConfigurableInstanceHostAdapter,
    GenericWorkflowHostAdapter,
    SorEntityHostAdapter,
    ProcessHostRegistry,
    ProcessLifecycleFacade,
    ConfigObjectStepExecutor,
    ChildProcessOrchestrationService,
    ScheduledTaskProcessBootstrapService,
    ProcessCompletionService,
    ProcessStepActionExecutorService,
    ProcessStepActionExecutionLogService,
    ProcessStepActionOrchestrationService,
    ProcessStepExecutionLogService,
    ProcessStepAssigneeService,
    ProcessStepAssigneeResolverService,
    ProcessStepExtensionEvaluatorService,
    ProcessStepFailureService,
    ProcessStepWebhookClient,
    ProcessStartRuleEngineService,
    ProcessStartRuleDedupService,
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
    AutomationEventHandlerService,
    ProcessStepActionExecutorService,
    ProcessStepExecutionLogService,
    ProcessStepAssigneeService,
    ProcessStepExtensionEvaluatorService,
    ProcessStepFailureService,
    ProcessStartRuleEngineService,
  ],
})
export class AutomationModule {}
