import { Injectable } from '@nestjs/common';
import { CreateProcessTemplateDto } from './dto/create-process_template.dto';
import { UpdateProcessTemplateDto } from './dto/update-process_template.dto';

@Injectable()
export class ProcessTemplatesService {
  create(createProcessTemplateDto: CreateProcessTemplateDto) {
    return 'This action adds a new processTemplate';
  }

  findAll() {
    return `This action returns all processTemplates`;
  }

  findOne(id: number) {
    return `This action returns a #${id} processTemplate`;
  }

  update(id: number, updateProcessTemplateDto: UpdateProcessTemplateDto) {
    return `This action updates a #${id} processTemplate`;
  }

  remove(id: number) {
    return `This action removes a #${id} processTemplate`;
  }
}
