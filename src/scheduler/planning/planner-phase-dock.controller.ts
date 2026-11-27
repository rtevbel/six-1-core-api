import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { RequirePermissions } from '../../authorization/authorization.decorator';
import { PlannerPhaseDockService } from './planner-phase-dock.service';
import {
  PlannerDockTemplateApplyDto,
  PlannerPhaseDockQueryDto,
  PlannerProcessRunAppendDto,
  PlannerProcessRunsListDto,
} from '../dto/planner-phase-dock.dto';
import {
  MICROSERVICE_PLANNER_DOCK_TEMPLATE_APPLY_PATTERN,
  MICROSERVICE_PLANNER_PHASE_DOCK_PATTERN,
  MICROSERVICE_PLANNER_PROCESS_RUNS_LIST_PATTERN,
  MICROSERVICE_PLANNER_PROCESS_RUN_APPEND_PATTERN,
} from '../constants';

@Controller('planner-phase-dock')
@UseFilters(AppRpcExceptionsFilter)
export class PlannerPhaseDockController {
  constructor(private readonly phaseDock: PlannerPhaseDockService) {}

  @MessagePattern(MICROSERVICE_PLANNER_PHASE_DOCK_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  getPhaseDock(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerPhaseDockQueryDto,
  ) {
    return this.phaseDock.getPhaseDock(userId, dto);
  }

  @MessagePattern(MICROSERVICE_PLANNER_DOCK_TEMPLATE_APPLY_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  applyTemplate(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerDockTemplateApplyDto,
  ) {
    return this.phaseDock.applyDockTemplate(userId, dto);
  }

  @MessagePattern(MICROSERVICE_PLANNER_PROCESS_RUNS_LIST_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  listProcessRuns(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerProcessRunsListDto,
  ) {
    return this.phaseDock.listProcessRuns(userId, dto);
  }

  @MessagePattern(MICROSERVICE_PLANNER_PROCESS_RUN_APPEND_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  appendProcessRun(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PlannerProcessRunAppendDto,
  ) {
    return this.phaseDock.appendProcessRun(userId, dto);
  }
}
