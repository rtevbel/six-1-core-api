import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessTemplateStepTriggerConditionSubmissionsService } from './process_template_step_trigger_condition_submissions.service';
import { CreateProcessTemplateStepTriggerConditionSubmissionDto } from './dto/create-process_template_step_trigger_condition_submission.dto';
import { UpdateProcessTemplateStepTriggerConditionSubmissionDto } from './dto/update-process_template_step_trigger_condition_submission.dto';

@Controller()
export class ProcessTemplateStepTriggerConditionSubmissionsController {
  constructor(private readonly processTemplateStepTriggerConditionSubmissionsService: ProcessTemplateStepTriggerConditionSubmissionsService) {}

  @MessagePattern('createProcessTemplateStepTriggerConditionSubmission')
  create(@Payload() createProcessTemplateStepTriggerConditionSubmissionDto: CreateProcessTemplateStepTriggerConditionSubmissionDto) {
    return this.processTemplateStepTriggerConditionSubmissionsService.create(createProcessTemplateStepTriggerConditionSubmissionDto);
  }

  @MessagePattern('findAllProcessTemplateStepTriggerConditionSubmissions')
  findAll() {
    return this.processTemplateStepTriggerConditionSubmissionsService.findAll();
  }

  @MessagePattern('findOneProcessTemplateStepTriggerConditionSubmission')
  findOne(@Payload() id: number) {
    return this.processTemplateStepTriggerConditionSubmissionsService.findOne(id);
  }

  @MessagePattern('updateProcessTemplateStepTriggerConditionSubmission')
  update(@Payload() updateProcessTemplateStepTriggerConditionSubmissionDto: UpdateProcessTemplateStepTriggerConditionSubmissionDto) {
    return this.processTemplateStepTriggerConditionSubmissionsService.update(updateProcessTemplateStepTriggerConditionSubmissionDto.id, updateProcessTemplateStepTriggerConditionSubmissionDto);
  }

  @MessagePattern('removeProcessTemplateStepTriggerConditionSubmission')
  remove(@Payload() id: number) {
    return this.processTemplateStepTriggerConditionSubmissionsService.remove(id);
  }
}
