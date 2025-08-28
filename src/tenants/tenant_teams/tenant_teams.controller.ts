import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantTeamService } from './tenant_teams.service';
import { CreateTenantTeamDto } from './dto/create-tenant_team.dto';
import { UpdateTenantTeamDto } from './dto/update-tenant_team.dto';
import { TenantTeamEntity } from './entities/tenant_team.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TENANT_TEAM_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_TEAM_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_TEAM_PATTERN,
  MICROSERVICE_UPDATE_TENANT_TEAM_PATTERN,
  MICROSERVICE_REMOVE_TENANT_TEAM_PATTERN,
  MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN,
} from './constants';

/**
 * Controller for managing tenant teams.
 */
@Controller('tenant-team')
export class TenantTeamController {
  constructor(private readonly tenantTeamService: TenantTeamService) {}

  /**
   * Handles the creation of tenant team information.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant for which team info is being created.
   * @param createTenantTeamDto - Data transfer object containing team info details.
   * @returns The created tenant team entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_TEAM_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createTeam(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') createTenantTeamDto: CreateTenantTeamDto,
  ): Promise<TenantTeamEntity> {
    return this.tenantTeamService.create(
      requestingUserId,
      tenantId,
      createTenantTeamDto,
    );
  }

  /**
   * Retrieves a single tenant team information by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the team info to retrieve.
   * @returns The tenant team entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_TEAM_PATTERN)
  async findOneTeam(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantTeamEntity> {
    return this.tenantTeamService.findOne(requestingUserId, tenantId, id);
  }

  /**
   * Retrieves all tenant team information based on filters.
   * @param requestingUserId - ID of the user making the request.
   * @param filtersDto - Filters for querying team information.
   * @returns A list of tenant team information matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_TEAM_PATTERN)
  async findAllByFilters(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return await this.tenantTeamService.findAllByFilter(
      requestingUserId,
      filtersDto,
    );
  }

  /**
   * Retrieves all team information for a specific tenant.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @returns A list of tenant team entities.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN)
  async findAllByTenantId(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<TenantTeamEntity[]> {
    return this.tenantTeamService.findAllByTenantId(requestingUserId, tenantId);
  }

  /**
   * Updates tenant team information.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param updateTenantTeamDto - Data transfer object containing updated team info details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_TEAM_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateTeam(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') updateTenantTeamDto: UpdateTenantTeamDto,
  ): Promise<UpdateResult> {
    return this.tenantTeamService.update(
      requestingUserId,
      tenantId,
      updateTenantTeamDto.tenantTeamId,
      updateTenantTeamDto,
    );
  }

  /**
   * Deletes tenant team information by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the team info to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_TEAM_PATTERN)
  async removeTeam(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantTeamService.remove(requestingUserId, tenantId, id);
  }
}
