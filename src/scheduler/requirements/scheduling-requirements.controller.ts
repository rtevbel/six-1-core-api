import { Controller, ParseIntPipe, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { AppRpcExceptionsFilter } from '../../common/filters/app-rpc-exceptions.filter';
import { RequirePermissions } from '../../authorization/authorization.decorator';
import { SchedulingRequirementsService } from './scheduling-requirements.service';
import {
  CloseSchedulingRequirementDto,
  CreateSchedulingRequirementDto,
  FiltersSchedulingRequirementDto,
  UpdateSchedulingRequirementDto,
} from '../dto/scheduling-requirement.dto';
import {
  MICROSERVICE_CLOSE_SCHEDULING_REQUIREMENT_PATTERN,
  MICROSERVICE_CREATE_SCHEDULING_REQUIREMENT_PATTERN,
  MICROSERVICE_FIND_ALL_SCHEDULING_REQUIREMENTS_PATTERN,
  MICROSERVICE_FIND_ONE_SCHEDULING_REQUIREMENT_PATTERN,
  MICROSERVICE_UPDATE_SCHEDULING_REQUIREMENT_PATTERN,
} from '../constants';

@Controller('scheduling-requirements')
@UseFilters(AppRpcExceptionsFilter)
export class SchedulingRequirementsController {
  constructor(
    private readonly requirementsService: SchedulingRequirementsService,
  ) {}

  /**
   * Create a scheduling requirement (project or board scope).
   */
  @MessagePattern(MICROSERVICE_CREATE_SCHEDULING_REQUIREMENT_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async create(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateSchedulingRequirementDto,
  ) {
    return this.requirementsService.create(userId, {
      tenantId: dto.tenantId,
      name: dto.name,
      description: dto.description,
      scopeType: dto.scopeType,
      primaryProjectId: dto.primaryProjectId,
      horizonStartUtc: new Date(dto.horizonStartUtc),
      horizonEndUtc: new Date(dto.horizonEndUtc),
      requirementKey: dto.requirementKey,
      promotePolicy: dto.promotePolicy,
      members: dto.members,
      createdBy: dto.createdBy,
    });
  }

  /**
   * Update an open scheduling requirement.
   */
  @MessagePattern(MICROSERVICE_UPDATE_SCHEDULING_REQUIREMENT_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async update(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: UpdateSchedulingRequirementDto,
  ) {
    return this.requirementsService.update(userId, {
      schedulingRequirementId: dto.schedulingRequirementId,
      tenantId: dto.tenantId,
      name: dto.name,
      description: dto.description,
      horizonStartUtc: dto.horizonStartUtc
        ? new Date(dto.horizonStartUtc)
        : undefined,
      horizonEndUtc: dto.horizonEndUtc
        ? new Date(dto.horizonEndUtc)
        : undefined,
      promotePolicy: dto.promotePolicy,
      members: dto.members,
    });
  }

  /**
   * Find one scheduling requirement with members.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_SCHEDULING_REQUIREMENT_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async findOne(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CloseSchedulingRequirementDto,
  ) {
    return this.requirementsService.findOne(
      userId,
      dto.schedulingRequirementId,
      dto.tenantId,
    );
  }

  /**
   * List scheduling requirements for a tenant.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_SCHEDULING_REQUIREMENTS_PATTERN)
  @RequirePermissions('scheduler.read')
  @UsePipes(AppRpcValidationPipe)
  async findAll(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: FiltersSchedulingRequirementDto,
  ) {
    return this.requirementsService.findAll(userId, dto);
  }

  /**
   * Close a scheduling requirement.
   */
  @MessagePattern(MICROSERVICE_CLOSE_SCHEDULING_REQUIREMENT_PATTERN)
  @RequirePermissions('scheduler.scenario.manage')
  @UsePipes(AppRpcValidationPipe)
  async close(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CloseSchedulingRequirementDto,
  ) {
    return this.requirementsService.close(
      userId,
      dto.schedulingRequirementId,
      dto.tenantId,
    );
  }
}
