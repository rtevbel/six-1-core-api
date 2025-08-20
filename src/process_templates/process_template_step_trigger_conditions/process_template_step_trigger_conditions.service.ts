import { Injectable } from '@nestjs/common';
import { CreateProcessTemplateStepTriggerConditionDto } from './dto/create-process_template_step_trigger_condition.dto';
import { UpdateProcessTemplateStepTriggerConditionDto } from './dto/update-process_template_step_trigger_condition.dto';

@Injectable()
export class ProcessTemplateStepTriggerConditionsService {
  create(createProcessTemplateStepTriggerConditionDto: CreateProcessTemplateStepTriggerConditionDto) {
    return 'This action adds a new processTemplateStepTriggerCondition';
  }

  findAll() {
    return `This action returns all processTemplateStepTriggerConditions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} processTemplateStepTriggerCondition`;
  }

  update(id: number, updateProcessTemplateStepTriggerConditionDto: UpdateProcessTemplateStepTriggerConditionDto) {
    return `This action updates a #${id} processTemplateStepTriggerCondition`;
  }

  remove(id: number) {
    return `This action removes a #${id} processTemplateStepTriggerCondition`;
  }
}
