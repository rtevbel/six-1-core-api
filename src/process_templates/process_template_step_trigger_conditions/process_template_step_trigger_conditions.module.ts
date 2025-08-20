import { Module } from '@nestjs/common';
import { ProcessTemplateStepTriggerConditionsService } from './process_template_step_trigger_conditions.service';
import { ProcessTemplateStepTriggerConditionsController } from './process_template_step_trigger_conditions.controller';

@Module({
  controllers: [ProcessTemplateStepTriggerConditionsController],
  providers: [ProcessTemplateStepTriggerConditionsService],
})
export class ProcessTemplateStepTriggerConditionsModule {}
