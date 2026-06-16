import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DeleteResult, UpdateResult } from 'typeorm';
import { ProcessTemplateStepObjectBindingsService } from './process_template_step_object_bindings.service';
import { CreateProcessTemplateStepObjectBindingDto } from './dto/create-process_template_step_object_binding.dto';
import { UpdateProcessTemplateStepObjectBindingDto } from './dto/update-process_template_step_object_binding.dto';
import { FiltersDto } from './dto/filters.dto';
import { ProcessTemplateStepObjectBindingEntity } from './entities/process_template_step_object_binding.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import {
  MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_OBJECT_BINDING_PATTERN,
  MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_OBJECT_BINDING_PATTERN,
  MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_OBJECT_BINDING_PATTERN,
  MICROSERVICE_UPDATE_PROCESS_TEMPLATE_STEP_OBJECT_BINDING_PATTERN,
  MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_OBJECT_BINDING_PATTERN,
} from './constants';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import { RequirePermissions } from '../../../authorization/authorization.decorator';

@Controller('process-template-step-object-bindings')
export class ProcessTemplateStepObjectBindingsController {
  constructor(
    private readonly bindingsService: ProcessTemplateStepObjectBindingsService,
  ) {}

  @MessagePattern(MICROSERVICE_CREATE_PROCESS_TEMPLATE_STEP_OBJECT_BINDING_PATTERN)
  @RequirePermissions('process_templates.update')
  @UsePipes(AppRpcValidationPipe)
  createProcessTemplateStepObjectBinding(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createDto: CreateProcessTemplateStepObjectBindingDto,
  ): Promise<ProcessTemplateStepObjectBindingEntity> {
    return this.bindingsService.create(userId, createDto);
  }

  @MessagePattern(
    MICROSERVICE_FIND_ALL_PROCESS_TEMPLATE_STEP_OBJECT_BINDING_PATTERN,
  )
  @RequirePermissions('process_templates.read')
  @UsePipes(AppRpcValidationPipe)
  findAllProcessTemplateStepObjectBindings(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.bindingsService.findAll(userId, filtersDto);
  }

  @MessagePattern(
    MICROSERVICE_FIND_ONE_PROCESS_TEMPLATE_STEP_OBJECT_BINDING_PATTERN,
  )
  @RequirePermissions('process_templates.read')
  findOneProcessTemplateStepObjectBinding(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') id: number,
  ): Promise<ProcessTemplateStepObjectBindingEntity | NotFoundException> {
    return this.bindingsService.findOne(userId, id);
  }

  @MessagePattern(MICROSERVICE_UPDATE_PROCESS_TEMPLATE_STEP_OBJECT_BINDING_PATTERN)
  @RequirePermissions('process_templates.update')
  @UsePipes(AppRpcValidationPipe)
  updateProcessTemplateStepObjectBinding(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') updateDto: UpdateProcessTemplateStepObjectBindingDto,
  ): Promise<UpdateResult> {
    return this.bindingsService.update(
      userId,
      updateDto.bindingId,
      updateDto,
    );
  }

  @MessagePattern(MICROSERVICE_REMOVE_PROCESS_TEMPLATE_STEP_OBJECT_BINDING_PATTERN)
  @RequirePermissions('process_templates.update')
  removeProcessTemplateStepObjectBinding(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('processTemplateStepId', ParseIntPipe)
    processTemplateStepId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.bindingsService.remove(userId, processTemplateStepId, id);
  }
}
