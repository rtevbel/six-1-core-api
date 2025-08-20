import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessTemplateStepTriggerConditionsService } from './process_template_step_trigger_conditions.service';
import { CreateProcessTemplateStepTriggerConditionDto } from './dto/create-process_template_step_trigger_condition.dto';
import { UpdateProcessTemplateStepTriggerConditionDto } from './dto/update-process_template_step_trigger_condition.dto';

@Controller()
export class ProcessTemplateStepTriggerConditionsController {
  constructor(private readonly processTemplateStepTriggerConditionsService: ProcessTemplateStepTriggerConditionsService) {}

  @MessagePattern('createProcessTemplateStepTriggerCondition')
  create(@Payload() createProcessTemplateStepTriggerConditionDto: CreateProcessTemplateStepTriggerConditionDto) {
    return this.processTemplateStepTriggerConditionsService.create(createProcessTemplateStepTriggerConditionDto);
  }

  @MessagePattern('findAllProcessTemplateStepTriggerConditions')
  findAll() {
    return this.processTemplateStepTriggerConditionsService.findAll();
  }

  @MessagePattern('findOneProcessTemplateStepTriggerCondition')
  findOne(@Payload() id: number) {
    return this.processTemplateStepTriggerConditionsService.findOne(id);
  }

  @MessagePattern('updateProcessTemplateStepTriggerCondition')
  update(@Payload() updateProcessTemplateStepTriggerConditionDto: UpdateProcessTemplateStepTriggerConditionDto) {
    return this.processTemplateStepTriggerConditionsService.update(updateProcessTemplateStepTriggerConditionDto.id, updateProcessTemplateStepTriggerConditionDto);
  }

  @MessagePattern('removeProcessTemplateStepTriggerCondition')
  remove(@Payload() id: number) {
    return this.processTemplateStepTriggerConditionsService.remove(id);
  }
}
