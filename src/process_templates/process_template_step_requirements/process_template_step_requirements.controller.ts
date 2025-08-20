import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessTemplateStepRequirementsService } from './process_template_step_requirements.service';
import { CreateProcessTemplateStepRequirementDto } from './dto/create-process_template_step_requirement.dto';
import { UpdateProcessTemplateStepRequirementDto } from './dto/update-process_template_step_requirement.dto';

@Controller()
export class ProcessTemplateStepRequirementsController {
  constructor(private readonly processTemplateStepRequirementsService: ProcessTemplateStepRequirementsService) {}

  @MessagePattern('createProcessTemplateStepRequirement')
  create(@Payload() createProcessTemplateStepRequirementDto: CreateProcessTemplateStepRequirementDto) {
    return this.processTemplateStepRequirementsService.create(createProcessTemplateStepRequirementDto);
  }

  @MessagePattern('findAllProcessTemplateStepRequirements')
  findAll() {
    return this.processTemplateStepRequirementsService.findAll();
  }

  @MessagePattern('findOneProcessTemplateStepRequirement')
  findOne(@Payload() id: number) {
    return this.processTemplateStepRequirementsService.findOne(id);
  }

  @MessagePattern('updateProcessTemplateStepRequirement')
  update(@Payload() updateProcessTemplateStepRequirementDto: UpdateProcessTemplateStepRequirementDto) {
    return this.processTemplateStepRequirementsService.update(updateProcessTemplateStepRequirementDto.id, updateProcessTemplateStepRequirementDto);
  }

  @MessagePattern('removeProcessTemplateStepRequirement')
  remove(@Payload() id: number) {
    return this.processTemplateStepRequirementsService.remove(id);
  }
}
