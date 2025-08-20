import { Module } from '@nestjs/common';
import { ProcessTemplateStepsService } from './process_template_steps.service';
import { ProcessTemplateStepsController } from './process_template_steps.controller';

@Module({
  controllers: [ProcessTemplateStepsController],
  providers: [ProcessTemplateStepsService],
})
export class ProcessTemplateStepsModule {}
