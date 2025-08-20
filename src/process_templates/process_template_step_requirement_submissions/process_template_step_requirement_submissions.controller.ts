import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessTemplateStepRequirementSubmissionsService } from './process_template_step_requirement_submissions.service';
import { CreateProcessTemplateStepRequirementSubmissionDto } from './dto/create-process_template_step_requirement_submission.dto';
import { UpdateProcessTemplateStepRequirementSubmissionDto } from './dto/update-process_template_step_requirement_submission.dto';

@Controller()
export class ProcessTemplateStepRequirementSubmissionsController {
  constructor(private readonly processTemplateStepRequirementSubmissionsService: ProcessTemplateStepRequirementSubmissionsService) {}

  @MessagePattern('createProcessTemplateStepRequirementSubmission')
  create(@Payload() createProcessTemplateStepRequirementSubmissionDto: CreateProcessTemplateStepRequirementSubmissionDto) {
    return this.processTemplateStepRequirementSubmissionsService.create(createProcessTemplateStepRequirementSubmissionDto);
  }

  @MessagePattern('findAllProcessTemplateStepRequirementSubmissions')
  findAll() {
    return this.processTemplateStepRequirementSubmissionsService.findAll();
  }

  @MessagePattern('findOneProcessTemplateStepRequirementSubmission')
  findOne(@Payload() id: number) {
    return this.processTemplateStepRequirementSubmissionsService.findOne(id);
  }

  @MessagePattern('updateProcessTemplateStepRequirementSubmission')
  update(@Payload() updateProcessTemplateStepRequirementSubmissionDto: UpdateProcessTemplateStepRequirementSubmissionDto) {
    return this.processTemplateStepRequirementSubmissionsService.update(updateProcessTemplateStepRequirementSubmissionDto.id, updateProcessTemplateStepRequirementSubmissionDto);
  }

  @MessagePattern('removeProcessTemplateStepRequirementSubmission')
  remove(@Payload() id: number) {
    return this.processTemplateStepRequirementSubmissionsService.remove(id);
  }
}
