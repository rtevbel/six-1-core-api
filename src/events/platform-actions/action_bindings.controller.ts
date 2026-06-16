import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DeleteResult, UpdateResult } from 'typeorm';
import { RequirePermissions } from '../../authorization/authorization.decorator';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { ActionBindingsService } from './action_bindings.service';
import { CreateActionBindingDto } from './dto/create-action_binding.dto';
import { UpdateActionBindingDto } from './dto/update-action_binding.dto';
import { ActionBindingFiltersDto } from './dto/action_binding-filters.dto';
import { ActionBindingEntity } from './entities/action_binding.entity';
import type { ActionBindingFindAllResult } from './interfaces/findall-result.interface';
import {
  MICROSERVICE_CREATE_ACTION_BINDING_PATTERN,
  MICROSERVICE_FIND_ALL_ACTION_BINDINGS_PATTERN,
  MICROSERVICE_FIND_ONE_ACTION_BINDING_PATTERN,
  MICROSERVICE_UPDATE_ACTION_BINDING_PATTERN,
  MICROSERVICE_REMOVE_ACTION_BINDING_PATTERN,
} from './constants';

@Controller('action-bindings')
export class ActionBindingsController {
  constructor(private readonly bindingsService: ActionBindingsService) {}

  @MessagePattern(MICROSERVICE_CREATE_ACTION_BINDING_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  createActionBinding(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateActionBindingDto,
  ): Promise<ActionBindingEntity> {
    return this.bindingsService.create(userId, dto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_ACTION_BINDINGS_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  findAllActionBindings(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: ActionBindingFiltersDto,
  ): Promise<ActionBindingFindAllResult> {
    return this.bindingsService.findAll(userId, filtersDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_ACTION_BINDING_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  findOneActionBinding(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    data: { bindingId: number; tenantId?: number },
  ): Promise<ActionBindingEntity> {
    return this.bindingsService.findOne(
      userId,
      data.bindingId,
      data.tenantId,
    );
  }

  @MessagePattern(MICROSERVICE_UPDATE_ACTION_BINDING_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  updateActionBinding(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    data: { bindingId: number; update: UpdateActionBindingDto },
  ): Promise<UpdateResult> {
    return this.bindingsService.update(userId, data.bindingId, data.update);
  }

  @MessagePattern(MICROSERVICE_REMOVE_ACTION_BINDING_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  removeActionBinding(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    data: { bindingId: number; tenantId?: number },
  ): Promise<DeleteResult> {
    return this.bindingsService.remove(userId, data.bindingId, data.tenantId);
  }
}
