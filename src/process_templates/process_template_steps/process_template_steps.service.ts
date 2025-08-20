import { Injectable } from '@nestjs/common';
import { CreateProcessTemplateStepDto } from './dto/create-process_template_step.dto';
import { UpdateProcessTemplateStepDto } from './dto/update-process_template_step.dto';

@Injectable()
export class ProcessTemplateStepsService {
  create(createProcessTemplateStepDto: CreateProcessTemplateStepDto) {
    return 'This action adds a new processTemplateStep';
  }

  findAll() {
    return `This action returns all processTemplateSteps`;
  }

  findOne(id: number) {
    return `This action returns a #${id} processTemplateStep`;
  }

  update(id: number, updateProcessTemplateStepDto: UpdateProcessTemplateStepDto) {
    return `This action updates a #${id} processTemplateStep`;
  }

  remove(id: number) {
    return `This action removes a #${id} processTemplateStep`;
  }
}
