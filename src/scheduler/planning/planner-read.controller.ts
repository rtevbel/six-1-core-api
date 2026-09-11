import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { RequirePermissions } from '../../authorization/authorization.decorator';
import { PlannerReadService } from './planner-read.service';
import {
  MICROSERVICE_PLANNER_BOARD_PATTERN,
  MICROSERVICE_PLANNER_CONFLICTS_PATTERN,
} from '../constants';

class PlannerBoardQueryDto {
  @IsInt()
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Type(() => Number)
  schedulingRequirementId!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  scheduleScenarioId?: number;
}

@Controller('planner-read')
@UseFilters(AppRpcExceptionsFilter)
export class PlannerReadController {
  constructor(private readonly plannerRead: PlannerReadService) {}

  @MessagePattern(MICROSERVICE_PLANNER_BOARD_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async board(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerBoardQueryDto,
  ) {
    return this.plannerRead.getBoard(userId, dto);
  }

  @MessagePattern(MICROSERVICE_PLANNER_CONFLICTS_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async conflicts(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerBoardQueryDto,
  ) {
    return this.plannerRead.getConflicts(userId, dto);
  }
}
