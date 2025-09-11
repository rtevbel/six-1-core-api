import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AutomationService } from './automation.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';

@Controller()
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @MessagePattern('createAutomation')
  create(@Payload() createAutomationDto: CreateAutomationDto) {
    return this.automationService.create(createAutomationDto);
  }

  @MessagePattern('findAllAutomation')
  findAll() {
    return this.automationService.findAll();
  }

  @MessagePattern('findOneAutomation')
  findOne(@Payload() id: number) {
    return this.automationService.findOne(id);
  }

  @MessagePattern('updateAutomation')
  update(@Payload() updateAutomationDto: UpdateAutomationDto) {
    return this.automationService.update(updateAutomationDto.id, updateAutomationDto);
  }

  @MessagePattern('removeAutomation')
  remove(@Payload() id: number) {
    return this.automationService.remove(id);
  }
}
