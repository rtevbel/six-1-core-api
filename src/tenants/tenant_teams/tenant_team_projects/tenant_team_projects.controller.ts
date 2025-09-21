import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantTeamProjectService } from './tenant_team_projects.service';
import { CreateTenantTeamProjectDto } from './dto/create-tenant_team_project.dto';
import { UpdateTenantTeamProjectDto } from './dto/update-tenant_team_project.dto';
import { TenantTeamProjectEntity } from './entities/tenant_team_project.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TENANT_TEAM_PROJECT_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_TEAM_PROJECT_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_TEAM_PROJECT_PATTERN,
  MICROSERVICE_UPDATE_TENANT_TEAM_PROJECT_PATTERN,
  MICROSERVICE_REMOVE_TENANT_TEAM_PROJECT_PATTERN,
} from './constants';

/**
 * Controller for managing tenant team projects.
 */
@Controller('tenant-team-project')
export class TenantTeamProjectController {
  constructor(
    private readonly tenantTeamProjectService: TenantTeamProjectService,
  ) {}

  /**
   * Handles the creation of tenant team project information.
   * @param userId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team for which project info is being created.
   * @param createTenantTeamProjectDto - Data transfer object containing project info details.
   * @returns The created tenant team project entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_TEAM_PROJECT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createProject(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantTeamId', ParseIntPipe) tenantTeamId: number,
    @Payload('data') createTenantTeamProjectDto: CreateTenantTeamProjectDto,
  ): Promise<TenantTeamProjectEntity> {
    return this.tenantTeamProjectService.create(
      userId,
      tenantTeamId,
      createTenantTeamProjectDto,
    );
  }

  /**
   * Retrieves a single tenant team project information by ID.
   * @param userId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team.
   * @param id - ID of the project info to retrieve.
   * @returns The tenant team project entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_TEAM_PROJECT_PATTERN)
  async findOneProject(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantTeamId', ParseIntPipe) tenantTeamId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantTeamProjectEntity> {
    return this.tenantTeamProjectService.findOne(userId, tenantTeamId, id);
  }

  /**
   * Retrieves all tenant team project information based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying project information.
   * @returns A list of tenant team project information matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_TEAM_PROJECT_PATTERN)
  async findAllByFilters(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return await this.tenantTeamProjectService.findAllByFilter(
      userId,
      filtersDto,
    );
  }

  /**
   * Updates tenant team project information.
   * @param userId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team.
   * @param updateTenantTeamProjectDto - Data transfer object containing updated project info details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_TEAM_PROJECT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateProject(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantTeamId', ParseIntPipe) tenantTeamId: number,
    @Payload('data') updateTenantTeamProjectDto: UpdateTenantTeamProjectDto,
  ): Promise<UpdateResult> {
    return this.tenantTeamProjectService.update(
      userId,
      tenantTeamId,
      updateTenantTeamProjectDto.teamProjectId,
      updateTenantTeamProjectDto,
    );
  }

  /**
   * Deletes tenant team project information by ID.
   * @param userId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team.
   * @param id - ID of the project info to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_TEAM_PROJECT_PATTERN)
  async removeProject(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantTeamId', ParseIntPipe) tenantTeamId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantTeamProjectService.remove(userId, tenantTeamId, id);
  }
}
