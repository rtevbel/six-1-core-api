import { Injectable } from '@nestjs/common';
import { CreateProcessTemplateStepTriggerConditionSubmissionDto } from './dto/create-process_template_step_trigger_condition_submission.dto';
import { UpdateProcessTemplateStepTriggerConditionSubmissionDto } from './dto/update-process_template_step_trigger_condition_submission.dto';

@Injectable()
export class ProcessTemplateStepTriggerConditionSubmissionsService {
  create(createProcessTemplateStepTriggerConditionSubmissionDto: CreateProcessTemplateStepTriggerConditionSubmissionDto) {
    return 'This action adds a new processTemplateStepTriggerConditionSubmission';
  }

  findAll() {
    return `This action returns all processTemplateStepTriggerConditionSubmissions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} processTemplateStepTriggerConditionSubmission`;
  }

  update(id: number, updateProcessTemplateStepTriggerConditionSubmissionDto: UpdateProcessTemplateStepTriggerConditionSubmissionDto) {
    return `This action updates a #${id} processTemplateStepTriggerConditionSubmission`;
  }

  remove(id: number) {
    return `This action removes a #${id} processTemplateStepTriggerConditionSubmission`;
  }
}
