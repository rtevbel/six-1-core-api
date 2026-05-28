import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessInstanceStepsService } from './process_instance_steps.service';
import { ProcessInstanceStepsController } from './process_instance_steps.controller';
import { ProcessInstanceStepEntity } from './entities/process_instance_step.entity';
import { ProcessInstanceStepObjectInstanceEntity } from './process_instance_step_object_instances/entities/process_instance_step_object_instance.entity';
import { ProcessInstanceStepRequirementsModule } from './process_instance_step_requirements/process_instance_step_requirements.module';
import { ProcessInstanceStepRequirementSubmissionsModule } from './process_instance_step_requirement_submissions/process_instance_step_requirement_submissions.module';
import { ProcessInstanceStepTriggerConditionsModule } from './process_instance_step_trigger_conditions/process_instance_step_trigger_conditions.module';
import { ConfigObjectsModule } from '../../config_objects/config_objects.module';

/**
 * ProcessInstanceStepsModule is responsible for managing process instance steps.
 * It includes the controller and service for handling operations
 * related to process instance steps.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessInstanceStepEntity for TypeORM.
    TypeOrmModule.forFeature([
      ProcessInstanceStepEntity,
      ProcessInstanceStepObjectInstanceEntity,
    ]),
    ProcessInstanceStepRequirementsModule,
    ProcessInstanceStepRequirementSubmissionsModule,
    ProcessInstanceStepTriggerConditionsModule,
    ConfigObjectsModule,
  ],
  controllers: [ProcessInstanceStepsController],
  providers: [ProcessInstanceStepsService],
  exports: [ProcessInstanceStepsService],
})
export class ProcessInstanceStepsModule {}
