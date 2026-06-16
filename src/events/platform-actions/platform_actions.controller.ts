import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DeleteResult, UpdateResult } from 'typeorm';
import { RequirePermissions } from '../../authorization/authorization.decorator';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { PlatformActionsService } from './platform_actions.service';
import { CreatePlatformActionDto } from './dto/create-platform_action.dto';
import { UpdatePlatformActionDto } from './dto/update-platform_action.dto';
import { PlatformActionFiltersDto } from './dto/platform_action-filters.dto';
import { PlatformActionEntity } from './entities/platform_action.entity';
import type { PlatformActionFindAllResult } from './interfaces/findall-result.interface';
import {
  MICROSERVICE_CREATE_PLATFORM_ACTION_PATTERN,
  MICROSERVICE_FIND_ALL_PLATFORM_ACTIONS_PATTERN,
  MICROSERVICE_FIND_ONE_PLATFORM_ACTION_PATTERN,
  MICROSERVICE_UPDATE_PLATFORM_ACTION_PATTERN,
  MICROSERVICE_REMOVE_PLATFORM_ACTION_PATTERN,
} from './constants';

@Controller('platform-actions')
export class PlatformActionsController {
  constructor(private readonly actionsService: PlatformActionsService) {}

  @MessagePattern(MICROSERVICE_CREATE_PLATFORM_ACTION_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  createPlatformAction(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreatePlatformActionDto,
  ): Promise<PlatformActionEntity> {
    return this.actionsService.create(userId, dto);
  }

  @MessagePattern(MICROSERVICE_FIND_ALL_PLATFORM_ACTIONS_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  findAllPlatformActions(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: PlatformActionFiltersDto,
  ): Promise<PlatformActionFindAllResult> {
    return this.actionsService.findAll(userId, filtersDto);
  }

  @MessagePattern(MICROSERVICE_FIND_ONE_PLATFORM_ACTION_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  findOnePlatformAction(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    data: { actionId: number; tenantId?: number },
  ): Promise<PlatformActionEntity> {
    return this.actionsService.findOne(userId, data.actionId, data.tenantId);
  }

  @MessagePattern(MICROSERVICE_UPDATE_PLATFORM_ACTION_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  updatePlatformAction(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    data: { actionId: number; update: UpdatePlatformActionDto },
  ): Promise<UpdateResult> {
    return this.actionsService.update(userId, data.actionId, data.update);
  }

  @MessagePattern(MICROSERVICE_REMOVE_PLATFORM_ACTION_PATTERN)
  @RequirePermissions('config.manage')
  @UsePipes(AppRpcValidationPipe)
  removePlatformAction(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    data: { actionId: number; tenantId?: number },
  ): Promise<DeleteResult> {
    return this.actionsService.remove(userId, data.actionId, data.tenantId);
  }
}
