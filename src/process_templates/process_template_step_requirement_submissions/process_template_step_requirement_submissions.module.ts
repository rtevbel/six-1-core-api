import { Module } from '@nestjs/common';
import { ProcessTemplateStepRequirementSubmissionsService } from './process_template_step_requirement_submissions.service';
import { ProcessTemplateStepRequirementSubmissionsController } from './process_template_step_requirement_submissions.controller';

@Module({
  controllers: [ProcessTemplateStepRequirementSubmissionsController],
  providers: [ProcessTemplateStepRequirementSubmissionsService],
})
export class ProcessTemplateStepRequirementSubmissionsModule {}
