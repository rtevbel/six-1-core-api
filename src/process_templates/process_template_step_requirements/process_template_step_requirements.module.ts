import { Module } from '@nestjs/common';
import { ProcessTemplateStepRequirementsService } from './process_template_step_requirements.service';
import { ProcessTemplateStepRequirementsController } from './process_template_step_requirements.controller';

@Module({
  controllers: [ProcessTemplateStepRequirementsController],
  providers: [ProcessTemplateStepRequirementsService],
})
export class ProcessTemplateStepRequirementsModule {}
