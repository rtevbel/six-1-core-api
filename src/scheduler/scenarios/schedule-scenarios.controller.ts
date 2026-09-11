import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { RequirePermissions } from '../../authorization/authorization.decorator';
import { ScheduleScenariosService } from './schedule-scenarios.service';
import { PromoteOrchestratorService } from './promote-orchestrator.service';
import {
  CompareScheduleScenariosDto,
  CreateScheduleScenarioDto,
  FiltersScheduleScenarioDto,
  FindScheduleScenarioDto,
  ForkScheduleScenarioDto,
  PromoteScheduleScenarioDto,
  SetScheduleScenarioStatusDto,
  UpdateScheduleScenarioDto,
} from '../dto/schedule-scenario.dto';
import {
  MICROSERVICE_COMPARE_SCHEDULE_SCENARIOS_PATTERN,
  MICROSERVICE_CREATE_SCHEDULE_SCENARIO_PATTERN,
  MICROSERVICE_FIND_ALL_SCHEDULE_SCENARIOS_PATTERN,
  MICROSERVICE_FIND_ONE_SCHEDULE_SCENARIO_PATTERN,
  MICROSERVICE_FORK_SCHEDULE_SCENARIO_PATTERN,
  MICROSERVICE_PROMOTE_SCHEDULE_SCENARIO_PATTERN,
  MICROSERVICE_SET_SCHEDULE_SCENARIO_STATUS_PATTERN,
  MICROSERVICE_UPDATE_SCHEDULE_SCENARIO_PATTERN,
} from '../constants';

@Controller('schedule-scenarios')
@UseFilters(AppRpcExceptionsFilter)
export class ScheduleScenariosController {
  constructor(
    private readonly scenariosService: ScheduleScenariosService,
    private readonly promoteOrchestrator: PromoteOrchestratorService,
  ) {}

  /**
   * Create a scenario (empty, from live, or from another scenario).
   */
  @MessagePattern(MICROSERVICE_CREATE_SCHEDULE_SCENARIO_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async create(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateScheduleScenarioDto,
  ) {
    const from =
      dto.from === 'live'
        ? ('live' as const)
        : dto.fromScenarioId != null
          ? { scenarioId: dto.fromScenarioId }
          : undefined;

    return this.scenariosService.create(userId, {
      tenantId: dto.tenantId,
      schedulingRequirementId: dto.schedulingRequirementId,
      name: dto.name,
      notes: dto.notes,
      from,
      activate: dto.activate,
    });
  }

  /**
   * Update scenario name / notes.
   */
  @MessagePattern(MICROSERVICE_UPDATE_SCHEDULE_SCENARIO_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateScheduleScenarioDto,
  ) {
    return this.scenariosService.update(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      name: dto.name,
      notes: dto.notes,
    });
  }

  /**
   * Set scenario status (draft | active | archived).
   */
  @MessagePattern(MICROSERVICE_SET_SCHEDULE_SCENARIO_STATUS_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async setStatus(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: SetScheduleScenarioStatusDto,
  ) {
    return this.scenariosService.setStatus(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      status: dto.status,
      expectedRevision: dto.expectedRevision,
    });
  }

  /**
   * Find one schedule scenario.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_SCHEDULE_SCENARIO_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: FindScheduleScenarioDto,
  ) {
    return this.scenariosService.findOne(
      userId,
      dto.scheduleScenarioId,
      dto.tenantId,
    );
  }

  /**
   * List scenarios for a scheduling requirement.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_SCHEDULE_SCENARIOS_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: FiltersScheduleScenarioDto,
  ) {
    return this.scenariosService.findAll(userId, dto);
  }

  /**
   * Fork a scenario into a new draft (optionally activate).
   */
  @MessagePattern(MICROSERVICE_FORK_SCHEDULE_SCENARIO_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async fork(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ForkScheduleScenarioDto,
  ) {
    return this.scenariosService.fork(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      name: dto.name,
      activate: dto.activate,
    });
  }

  /**
   * Compare two scenarios under the same requirement.
   */
  @MessagePattern(MICROSERVICE_COMPARE_SCHEDULE_SCENARIOS_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async compare(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CompareScheduleScenariosDto,
  ) {
    return this.scenariosService.compare(userId, {
      tenantId: dto.tenantId,
      leftId: dto.leftId,
      rightId: dto.rightId,
    });
  }

  /**
   * Promote an active scenario to live (replace-live-for-scope).
   */
  @MessagePattern(MICROSERVICE_PROMOTE_SCHEDULE_SCENARIO_PATTERN)
  @RequirePermissions('scheduler.promote')
  @UsePipes(AppRpcValidationPipe)
  async promote(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: PromoteScheduleScenarioDto,
  ) {
    return this.promoteOrchestrator.promote(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      expectedRevision: dto.expectedRevision,
      overrideHardConflicts: dto.overrideHardConflicts,
    });
  }
}
