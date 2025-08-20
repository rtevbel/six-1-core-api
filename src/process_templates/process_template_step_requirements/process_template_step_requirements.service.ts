import { Injectable } from '@nestjs/common';
import { CreateProcessTemplateStepRequirementDto } from './dto/create-process_template_step_requirement.dto';
import { UpdateProcessTemplateStepRequirementDto } from './dto/update-process_template_step_requirement.dto';

@Injectable()
export class ProcessTemplateStepRequirementsService {
  create(createProcessTemplateStepRequirementDto: CreateProcessTemplateStepRequirementDto) {
    return 'This action adds a new processTemplateStepRequirement';
  }

  findAll() {
    return `This action returns all processTemplateStepRequirements`;
  }

  findOne(id: number) {
    return `This action returns a #${id} processTemplateStepRequirement`;
  }

  update(id: number, updateProcessTemplateStepRequirementDto: UpdateProcessTemplateStepRequirementDto) {
    return `This action updates a #${id} processTemplateStepRequirement`;
  }

  remove(id: number) {
    return `This action removes a #${id} processTemplateStepRequirement`;
  }
}
