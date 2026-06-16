import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DeleteResult, UpdateResult } from 'typeorm';
import { RequirePermissions } from '../../../authorization/authorization.decorator';
import { ProcessTemplateStepActionsService } from './process_template_step_actions.service';
import { CreateProcessTemplateStepActionDto } from './dto/create-process_template_step_action.dto';
import { UpdateProcessTemplateStepActionDto } from './dto/update-process_template_step_action.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindOneProcessTemplateStepActionDto } from './dto/find-one-process_template_step_action.dto';
import { RemoveProcessTemplateStepActionDto } from './dto/remove-process_template_step_action.dto';
import { ProcessTemplateStepActionEntity } from './entities/process_template_step_action.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import {
  MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
  MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
  MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
  MICROSERVICE_UPDATE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
  MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN,
} from './constants';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';

@Controller('process-template-step-actions')
export class ProcessTemplateStepActionsController {
  constructor(
    private readonly actionsService: ProcessTemplateStepActionsService,
  ) {}

  @MessagePattern(MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN)
  @RequirePermissions('process_templates.update')
  @UsePipes(AppRpcValidationPipe)
  createProcessTemplateStepAction(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateProcessTemplateStepActionDto,
  ): Promise<ProcessTemplateStepActionEntity> {
    return this.actionsService.create(userId, createDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_ACTION_PATTERN)
  @RequirePermissions('process_templates.read')
  @UsePipes(AppRpcValidationPipe)
  findAllProcessTemplateStepActions(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.actionsService.findAll(userId, filtersDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN)
  @RequirePermissions('process_templates.read')
  findOneProcessTemplateStepAction(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') data: number | FindOneProcessTemplateStepActionDto,
  ): Promise<ProcessTemplateStepActionEntity | NotFoundException> {
    return this.actionsService.findOne(userId, data);
  }

  @MessagePattern(MICROSERVICE_UPDATE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN)
  @RequirePermissions('process_templates.update')
  @UsePipes(AppRpcValidationPipe)
  updateProcessTemplateStepAction(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateDto: UpdateProcessTemplateStepActionDto,
  ): Promise<UpdateResult> {
    return this.actionsService.update(userId, updateDto.stepActionId, updateDto);
  }

  @MessagePattern(MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_ACTION_PATTERN)
  @RequirePermissions('process_templates.update')
  removeProcessTemplateStepAction(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('processTemplateStepId', ParseIntPipe)
    processTemplateStepId: number,
    @Payload('data') data: number | RemoveProcessTemplateStepActionDto,
  ): Promise<DeleteResult> {
    if (typeof data === 'number') {
      return this.actionsService.remove(userId, processTemplateStepId, data);
    }

    return this.actionsService.remove(
      userId,
      data.processTemplateStepId,
      data.stepActionId,
      data.tenantId,
    );
  }
}
