import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { RequirePermissions } from '../../authorization/authorization.decorator';
import { PlannerReadService } from './planner-read.service';
import { PlannerReadQueryDto } from '../dto/planner-read.dto';
import {
  MICROSERVICE_PLANNER_BOARD_PATTERN,
  MICROSERVICE_PLANNER_CONFLICTS_PATTERN,
  MICROSERVICE_PLANNER_KPIS_PATTERN,
} from '../constants';

@Controller('planner-read')
@UseFilters(AppRpcExceptionsFilter)
export class PlannerReadController {
  constructor(private readonly plannerRead: PlannerReadService) {}

  @MessagePattern(MICROSERVICE_PLANNER_BOARD_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async board(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerReadQueryDto,
  ) {
    return this.plannerRead.getBoard(userId, dto);
  }

  @MessagePattern(MICROSERVICE_PLANNER_KPIS_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async kpis(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerReadQueryDto,
  ) {
    return this.plannerRead.getKpis(userId, dto);
  }

  @MessagePattern(MICROSERVICE_PLANNER_CONFLICTS_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async conflicts(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerReadQueryDto,
  ) {
    return this.plannerRead.getConflicts(userId, dto);
  }
}
