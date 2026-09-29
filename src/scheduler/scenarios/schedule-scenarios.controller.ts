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
  GetScheduleScenarioVersionDto,
  ListScheduleScenarioVersionsDto,
  MarkScheduleScenarioDefinitiveDto,
  RestoreScheduleScenarioVersionDto,
  SaveScheduleScenarioDto,
} from '../dto/schedule-scenario-lifecycle.dto';
import {
  MICROSERVICE_COMPARE_SCHEDULE_SCENARIOS_PATTERN,
  MICROSERVICE_CREATE_SCHEDULE_SCENARIO_PATTERN,
  MICROSERVICE_FIND_ALL_SCHEDULE_SCENARIOS_PATTERN,
  MICROSERVICE_FIND_ONE_SCHEDULE_SCENARIO_PATTERN,
  MICROSERVICE_FORK_SCHEDULE_SCENARIO_PATTERN,
  MICROSERVICE_GET_SCHEDULE_SCENARIO_VERSION_PATTERN,
  MICROSERVICE_LIST_SCHEDULE_SCENARIO_VERSIONS_PATTERN,
  MICROSERVICE_MARK_SCHEDULE_SCENARIO_DEFINITIVE_PATTERN,
  MICROSERVICE_PROMOTE_SCHEDULE_SCENARIO_PATTERN,
  MICROSERVICE_RESTORE_SCHEDULE_SCENARIO_VERSION_PATTERN,
  MICROSERVICE_SAVE_SCHEDULE_SCENARIO_PATTERN,
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

  @MessagePattern(MICROSERVICE_FIND_ALL_SCHEDULE_SCENARIOS_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: FiltersScheduleScenarioDto,
  ) {
    return this.scenariosService.findAll(userId, dto);
  }

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

  @MessagePattern(MICROSERVICE_SAVE_SCHEDULE_SCENARIO_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async save(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: SaveScheduleScenarioDto,
  ) {
    return this.scenariosService.save(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      expectedRevision: dto.expectedRevision,
      summary: dto.summary,
    });
  }

  @MessagePattern(MICROSERVICE_MARK_SCHEDULE_SCENARIO_DEFINITIVE_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async markDefinitive(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: MarkScheduleScenarioDefinitiveDto,
  ) {
    return this.scenariosService.markDefinitive(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      expectedRevision: dto.expectedRevision,
    });
  }

  @MessagePattern(MICROSERVICE_LIST_SCHEDULE_SCENARIO_VERSIONS_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async listVersions(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: ListScheduleScenarioVersionsDto,
  ) {
    return this.scenariosService.listVersions(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      page: dto.page,
      limit: dto.limit,
    });
  }

  @MessagePattern(MICROSERVICE_GET_SCHEDULE_SCENARIO_VERSION_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async getVersion(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: GetScheduleScenarioVersionDto,
  ) {
    return this.scenariosService.getVersion(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      version: dto.version,
    });
  }

  @MessagePattern(MICROSERVICE_RESTORE_SCHEDULE_SCENARIO_VERSION_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async restoreVersion(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: RestoreScheduleScenarioVersionDto,
  ) {
    return this.scenariosService.restoreVersion(userId, {
      tenantId: dto.tenantId,
      scheduleScenarioId: dto.scheduleScenarioId,
      version: dto.version,
      expectedRevision: dto.expectedRevision,
    });
  }

  /**
   * Commit to live — promote definitive scenario only (definitive_only).
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
