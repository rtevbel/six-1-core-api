import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { RequirePermissions } from '../../authorization/authorization.decorator';
import { PlannerMutateService } from './planner-mutate.service';
import {
  PlannerAssessDto,
  PlannerSuggestDto,
  PlannerTaskRemoveDto,
  PlannerTaskUpsertDto,
} from '../dto/planner-mutate.dto';
import {
  MICROSERVICE_CONSTRAINTS_SUGGEST_PATTERN,
  MICROSERVICE_PLANNER_ASSESS_PATTERN,
  MICROSERVICE_PLANNER_TASK_REMOVE_PATTERN,
  MICROSERVICE_PLANNER_TASK_UPSERT_PATTERN,
} from '../constants';

@Controller('planner-mutate')
@UseFilters(AppRpcExceptionsFilter)
export class PlannerMutateController {
  constructor(private readonly plannerMutate: PlannerMutateService) {}

  @MessagePattern(MICROSERVICE_PLANNER_TASK_UPSERT_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async upsertTask(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerTaskUpsertDto,
  ) {
    return this.plannerMutate.upsertTask(userId, dto);
  }

  @MessagePattern(MICROSERVICE_PLANNER_TASK_REMOVE_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async removeTask(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerTaskRemoveDto,
  ) {
    return this.plannerMutate.removeTask(userId, dto);
  }

  @MessagePattern(MICROSERVICE_PLANNER_ASSESS_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async assess(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerAssessDto,
  ) {
    return this.plannerMutate.assess(userId, dto);
  }

  @MessagePattern(MICROSERVICE_CONSTRAINTS_SUGGEST_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async suggest(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerSuggestDto,
  ) {
    return this.plannerMutate.suggest(userId, dto);
  }
}
