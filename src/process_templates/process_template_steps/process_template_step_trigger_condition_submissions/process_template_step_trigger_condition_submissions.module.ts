import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProcessTemplateStepTriggerConditionSubmissionsService } from './process_template_step_trigger_condition_submissions.service';
import { ProcessTemplateStepTriggerConditionSubmissionsController } from './process_template_step_trigger_condition_submissions.controller';

import { ProcessTemplateStepTriggerConditionSubmissionEntity } from './entities/process_template_step_trigger_condition_submission.entity';

/**
 * ProcessTemplateStepTriggerConditionSubmissionsModule is responsible for managing
 * process template step trigger condition submissions. It includes the controller
 * and service for handling operations related to these submissions.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    // Registers the ProcessTemplateStepTriggerConditionSubmissionEntity for TypeORM.
    TypeOrmModule.forFeature([
      ProcessTemplateStepTriggerConditionSubmissionEntity,
    ]),
  ],
  controllers: [ProcessTemplateStepTriggerConditionSubmissionsController],
  providers: [ProcessTemplateStepTriggerConditionSubmissionsService],
})
export class ProcessTemplateStepTriggerConditionSubmissionsModule {}
