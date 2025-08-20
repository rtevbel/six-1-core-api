import { Module } from '@nestjs/common';
import { ProcessTemplatesService } from './process_templates.service';
import { ProcessTemplatesController } from './process_templates.controller';
import { ProcessTemplateStepsModule } from './process_template_steps/process_template_steps.module';
import { ProcessTemplateStepRequirementsModule } from './process_template_step_requirements/process_template_step_requirements.module';
import { ProcessTemplateStepRequirementSubmissionsModule } from './process_template_step_requirement_submissions/process_template_step_requirement_submissions.module';
import { ProcessTemplateStepTriggerConditionsModule } from './process_template_step_trigger_conditions/process_template_step_trigger_conditions.module';
import { ProcessTemplateStepTriggerConditionSubmissionsModule } from './process_template_step_trigger_condition_submissions/process_template_step_trigger_condition_submissions.module';

@Module({
  controllers: [ProcessTemplatesController],
  providers: [ProcessTemplatesService],
  imports: [ProcessTemplateStepsModule, ProcessTemplateStepRequirementsModule, ProcessTemplateStepRequirementSubmissionsModule, ProcessTemplateStepTriggerConditionsModule, ProcessTemplateStepTriggerConditionSubmissionsModule],
})
export class ProcessTemplatesModule {}
