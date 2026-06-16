import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessInstancesService } from './process_instances.service';
import { ProcessRunnerService } from './process-runner.service';
import { ProcessStepPermissionService } from './process-step-permission.service';
import { ProcessInstanceTimelineService } from './process-instance-timeline.service';
import { ProcessInstancesController } from './process_instances.controller';
import { ProcessInstanceStepsModule } from './process_instance_steps/process_instance_steps.module';
import { ProcessInstanceEntity } from './entities/process_instance.entity';
import { ProcessStepExecutionLogEntity } from './entities/process_step_execution_log.entity';
import { ProcessInstanceStepEntity } from './process_instance_steps/entities/process_instance_step.entity';
import { ProcessActionExecutionLogEntity } from './process_instance_steps/process_instance_step_actions/entities/process_action_execution_log.entity';
import { PlatformEventRecordEntity } from '../events/platform-bus/entities/platform_event_record.entity';
import { ConfigObjectsModule } from '../config_objects/config_objects.module';
import { AutomationModule } from '../automation/automation.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ProcessStepLockEntity } from './process_step_locks/entities/process_step_lock.entity';
import { ProcessStepLocksService } from './process_step_locks/process-step-locks.service';

/**
 * ProcessInstancesModule is responsible for managing process instances.
 * It includes the controller and service for handling operations
 * related to process instances and integrates various submodules for process instance management.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProcessInstanceEntity,
      ProcessInstanceStepEntity,
      ProcessActionExecutionLogEntity,
      ProcessStepExecutionLogEntity,
      PlatformEventRecordEntity,
      ProcessStepLockEntity,
    ]),
    ProcessInstanceStepsModule,
    forwardRef(() => ConfigObjectsModule),
    forwardRef(() => AutomationModule),
    AuthorizationModule,
  ],
  controllers: [ProcessInstancesController],
  providers: [
    ProcessInstancesService,
    ProcessRunnerService,
    ProcessStepPermissionService,
    ProcessInstanceTimelineService,
    ProcessStepLocksService,
  ],
  exports: [
    ProcessInstancesService,
    ProcessRunnerService,
    ProcessStepPermissionService,
    ProcessInstanceTimelineService,
    ProcessStepLocksService,
  ],
})
export class ProcessInstancesModule {}
