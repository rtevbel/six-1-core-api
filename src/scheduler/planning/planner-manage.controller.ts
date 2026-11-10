import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { RequirePermissions } from '../../authorization/authorization.decorator';
import { PlannerManageService } from './planner-manage.service';
import {
  PlannerManageCatalogDto,
  PlannerManageListDto,
  PlannerManageRemoveDto,
  PlannerManageResolveDto,
  PlannerManageSchemaDto,
  PlannerManageUpsertDto,
} from '../dto/planner-manage.dto';
import {
  MICROSERVICE_PLANNER_MANAGE_CATALOG_PATTERN,
  MICROSERVICE_PLANNER_MANAGE_LIST_PATTERN,
  MICROSERVICE_PLANNER_MANAGE_REMOVE_PATTERN,
  MICROSERVICE_PLANNER_MANAGE_RESOLVE_PATTERN,
  MICROSERVICE_PLANNER_MANAGE_SCHEMA_PATTERN,
  MICROSERVICE_PLANNER_MANAGE_UPSERT_PATTERN,
} from '../constants';

@Controller('planner-manage')
@UseFilters(AppRpcExceptionsFilter)
export class PlannerManageController {
  constructor(private readonly plannerManage: PlannerManageService) {}

  @MessagePattern(MICROSERVICE_PLANNER_MANAGE_CATALOG_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async catalog(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerManageCatalogDto,
  ) {
    return this.plannerManage.catalog(userId, dto);
  }

  @MessagePattern(MICROSERVICE_PLANNER_MANAGE_SCHEMA_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async schema(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerManageSchemaDto,
  ) {
    return this.plannerManage.schema(userId, dto);
  }

  @MessagePattern(MICROSERVICE_PLANNER_MANAGE_RESOLVE_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async resolve(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerManageResolveDto,
  ) {
    return this.plannerManage.resolve(userId, dto);
  }

  @MessagePattern(MICROSERVICE_PLANNER_MANAGE_LIST_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async list(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerManageListDto,
  ) {
    return this.plannerManage.list(userId, dto);
  }

  @MessagePattern(MICROSERVICE_PLANNER_MANAGE_UPSERT_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async upsert(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerManageUpsertDto,
  ) {
    return this.plannerManage.upsert(userId, dto);
  }

  @MessagePattern(MICROSERVICE_PLANNER_MANAGE_REMOVE_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async remove(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerManageRemoveDto,
  ) {
    return this.plannerManage.remove(userId, dto);
  }
}
