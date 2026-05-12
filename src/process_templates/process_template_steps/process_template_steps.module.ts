import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProcessTemplateStepsService } from './process_template_steps.service';
import { ProcessTemplateStepsController } from './process_template_steps.controller';

import { ProcessTemplateStepEntity } from './entities/process_template_step.entity';
import { ProcessTemplateStepDescriptionEntity } from './entities/process_template_step_description.entity';

import { ProcessTemplateStepRequirementsModule } from './process_template_step_requirements/process_template_step_requirements.module';
import { ProcessTemplateStepRequirementSubmissionsModule } from './process_template_step_requirement_submissions/process_template_step_requirement_submissions.module';
import { ProcessTemplateStepTriggerConditionsModule } from './process_template_step_trigger_conditions/process_template_step_trigger_conditions.module';
import { ProcessTemplateStepTriggerConditionSubmissionsModule } from './process_template_step_trigger_condition_submissions/process_template_step_trigger_condition_submissions.module';
import { ConfigObjectsModule } from '../../config_objects/config_objects.module';

/**
 * ProcessTemplateStepsModule is responsible for managing process template steps.
 * It includes the controller and service for handling operations
 * related to process template steps.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessTemplateStepEntity and ProcessTemplateStepDescriptionEntity for TypeORM.
    TypeOrmModule.forFeature([
      ProcessTemplateStepEntity,
      ProcessTemplateStepDescriptionEntity,
    ]),
    ProcessTemplateStepRequirementsModule,
    ProcessTemplateStepRequirementSubmissionsModule,
    ProcessTemplateStepTriggerConditionsModule,
    ProcessTemplateStepTriggerConditionSubmissionsModule,
    ConfigObjectsModule,
  ],
  controllers: [ProcessTemplateStepsController],
  providers: [ProcessTemplateStepsService],
  exports: [ProcessTemplateStepsService],
})
export class ProcessTemplateStepsModule {}
