import {
  Controller,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DeleteResult } from 'typeorm';
import { RequirePermissions } from '../../../authorization/authorization.decorator';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import { ProcessTemplateStepAssigneesService } from './process_template_step_assignees.service';
import { CreateProcessTemplateStepAssigneeDto } from './dto/create-process_template_step_assignee.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindOneProcessTemplateStepAssigneeDto } from './dto/find-one-process_template_step_assignee.dto';
import { RemoveProcessTemplateStepAssigneeDto } from './dto/remove-process_template_step_assignee.dto';
import { ProcessTemplateStepAssigneeEntity } from './entities/process_template_step_assignee.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import {
  MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_ASSIGNEE_PATTERN,
  MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_ASSIGNEE_PATTERN,
  MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_ASSIGNEE_PATTERN,
  MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_ASSIGNEE_PATTERN,
} from './constants';

@Controller('process-template-step-assignees')
export class ProcessTemplateStepAssigneesController {
  constructor(
    private readonly assigneesService: ProcessTemplateStepAssigneesService,
  ) {}

  @MessagePattern(MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_ASSIGNEE_PATTERN)
  @RequirePermissions('process_templates.update')
  @UsePipes(AppRpcValidationPipe)
  /** @deprecated Use assigneeSpec on process template steps. */
  createProcessTemplateStepAssignee(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateProcessTemplateStepAssigneeDto,
  ): Promise<ProcessTemplateStepAssigneeEntity> {
    return this.assigneesService.create(userId, createDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_ASSIGNEE_PATTERN)
  @RequirePermissions('process_templates.read')
  @UsePipes(AppRpcValidationPipe)
  findAllProcessTemplateStepAssignees(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return this.assigneesService.findAll(userId, filtersDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_ASSIGNEE_PATTERN)
  @RequirePermissions('process_templates.read')
  findOneProcessTemplateStepAssignee(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') data: number | FindOneProcessTemplateStepAssigneeDto,
  ): Promise<ProcessTemplateStepAssigneeEntity> {
    return this.assigneesService.findOne(userId, data);
  }

  @MessagePattern(MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_ASSIGNEE_PATTERN)
  @RequirePermissions('process_templates.update')
  /** @deprecated Use assigneeSpec on process template steps. */
  removeProcessTemplateStepAssignee(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') data: number | RemoveProcessTemplateStepAssigneeDto,
  ): Promise<DeleteResult> {
    return this.assigneesService.remove(userId, data);
  }
}
