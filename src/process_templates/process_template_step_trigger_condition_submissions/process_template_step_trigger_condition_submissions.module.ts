import { Module } from '@nestjs/common';
import { ProcessTemplateStepTriggerConditionSubmissionsService } from './process_template_step_trigger_condition_submissions.service';
import { ProcessTemplateStepTriggerConditionSubmissionsController } from './process_template_step_trigger_condition_submissions.controller';

@Module({
  controllers: [ProcessTemplateStepTriggerConditionSubmissionsController],
  providers: [ProcessTemplateStepTriggerConditionSubmissionsService],
})
export class ProcessTemplateStepTriggerConditionSubmissionsModule {}
