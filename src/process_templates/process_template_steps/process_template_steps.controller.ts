import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessTemplateStepsService } from './process_template_steps.service';
import { CreateProcessTemplateStepDto } from './dto/create-process_template_step.dto';
import { UpdateProcessTemplateStepDto } from './dto/update-process_template_step.dto';

@Controller()
export class ProcessTemplateStepsController {
  constructor(private readonly processTemplateStepsService: ProcessTemplateStepsService) {}

  @MessagePattern('createProcessTemplateStep')
  create(@Payload() createProcessTemplateStepDto: CreateProcessTemplateStepDto) {
    return this.processTemplateStepsService.create(createProcessTemplateStepDto);
  }

  @MessagePattern('findAllProcessTemplateSteps')
  findAll() {
    return this.processTemplateStepsService.findAll();
  }

  @MessagePattern('findOneProcessTemplateStep')
  findOne(@Payload() id: number) {
    return this.processTemplateStepsService.findOne(id);
  }

  @MessagePattern('updateProcessTemplateStep')
  update(@Payload() updateProcessTemplateStepDto: UpdateProcessTemplateStepDto) {
    return this.processTemplateStepsService.update(updateProcessTemplateStepDto.id, updateProcessTemplateStepDto);
  }

  @MessagePattern('removeProcessTemplateStep')
  remove(@Payload() id: number) {
    return this.processTemplateStepsService.remove(id);
  }
}
