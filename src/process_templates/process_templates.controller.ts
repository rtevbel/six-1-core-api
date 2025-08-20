import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessTemplatesService } from './process_templates.service';
import { CreateProcessTemplateDto } from './dto/create-process_template.dto';
import { UpdateProcessTemplateDto } from './dto/update-process_template.dto';

@Controller()
export class ProcessTemplatesController {
  constructor(private readonly processTemplatesService: ProcessTemplatesService) {}

  @MessagePattern('createProcessTemplate')
  create(@Payload() createProcessTemplateDto: CreateProcessTemplateDto) {
    return this.processTemplatesService.create(createProcessTemplateDto);
  }

  @MessagePattern('findAllProcessTemplates')
  findAll() {
    return this.processTemplatesService.findAll();
  }

  @MessagePattern('findOneProcessTemplate')
  findOne(@Payload() id: number) {
    return this.processTemplatesService.findOne(id);
  }

  @MessagePattern('updateProcessTemplate')
  update(@Payload() updateProcessTemplateDto: UpdateProcessTemplateDto) {
    return this.processTemplatesService.update(updateProcessTemplateDto.id, updateProcessTemplateDto);
  }

  @MessagePattern('removeProcessTemplate')
  remove(@Payload() id: number) {
    return this.processTemplatesService.remove(id);
  }
}
