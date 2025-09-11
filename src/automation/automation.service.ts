import { Injectable } from '@nestjs/common';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';

@Injectable()
export class AutomationService {
  create(createAutomationDto: CreateAutomationDto) {
    return 'This action adds a new automation';
  }

  findAll() {
    return `This action returns all automation`;
  }

  findOne(id: number) {
    return `This action returns a #${id} automation`;
  }

  update(id: number, updateAutomationDto: UpdateAutomationDto) {
    return `This action updates a #${id} automation`;
  }

  remove(id: number) {
    return `This action removes a #${id} automation`;
  }
}
