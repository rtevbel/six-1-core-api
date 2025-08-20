import { Injectable } from '@nestjs/common';
import { CreateProcessTemplateStepRequirementSubmissionDto } from './dto/create-process_template_step_requirement_submission.dto';
import { UpdateProcessTemplateStepRequirementSubmissionDto } from './dto/update-process_template_step_requirement_submission.dto';

@Injectable()
export class ProcessTemplateStepRequirementSubmissionsService {
  create(createProcessTemplateStepRequirementSubmissionDto: CreateProcessTemplateStepRequirementSubmissionDto) {
    return 'This action adds a new processTemplateStepRequirementSubmission';
  }

  findAll() {
    return `This action returns all processTemplateStepRequirementSubmissions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} processTemplateStepRequirementSubmission`;
  }

  update(id: number, updateProcessTemplateStepRequirementSubmissionDto: UpdateProcessTemplateStepRequirementSubmissionDto) {
    return `This action updates a #${id} processTemplateStepRequirementSubmission`;
  }

  remove(id: number) {
    return `This action removes a #${id} processTemplateStepRequirementSubmission`;
  }
}
