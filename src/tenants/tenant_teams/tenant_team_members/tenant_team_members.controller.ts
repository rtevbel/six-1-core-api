import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantTeamMemberService } from './tenant_team_members.service';
import { CreateTenantTeamMemberDto } from './dto/create-tenant_team_member.dto';
import { UpdateTenantTeamMemberDto } from './dto/update-tenant_team_member.dto';
import { TenantTeamMemberEntity } from './entities/tenant_team_member.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TENANT_TEAM_MEMBER_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_TEAM_MEMBER_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_TEAM_MEMBER_PATTERN,
  MICROSERVICE_UPDATE_TENANT_TEAM_MEMBER_PATTERN,
  MICROSERVICE_REMOVE_TENANT_TEAM_MEMBER_PATTERN,
  MICROSERVICE_FIND_ALL_BY_TENANT_TEAM_ID_PATTERN,
} from './constants';

/**
 * Controller for managing tenant team members.
 */
@Controller('tenant-team-member')
export class TenantTeamMemberController {
  constructor(
    private readonly tenantTeamMemberService: TenantTeamMemberService,
  ) {}

  /**
   * Handles the creation of tenant team member information.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team for which member info is being created.
   * @param createTenantTeamMemberDto - Data transfer object containing member info details.
   * @returns The created tenant team member entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_TEAM_MEMBER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createMember(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantTeamId', ParseIntPipe) tenantTeamId: number,
    @Payload('data') createTenantTeamMemberDto: CreateTenantTeamMemberDto,
  ): Promise<TenantTeamMemberEntity> {
    return this.tenantTeamMemberService.create(
      requestingUserId,
      tenantTeamId,
      createTenantTeamMemberDto,
    );
  }

  /**
   * Retrieves a single tenant team member information by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team.
   * @param id - ID of the member info to retrieve.
   * @returns The tenant team member entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_TEAM_MEMBER_PATTERN)
  async findOneMember(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantTeamId', ParseIntPipe) tenantTeamId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantTeamMemberEntity> {
    return this.tenantTeamMemberService.findOne(
      requestingUserId,
      tenantTeamId,
      id,
    );
  }

  /**
   * Retrieves all tenant team member information based on filters.
   * @param requestingUserId - ID of the user making the request.
   * @param filtersDto - Filters for querying member information.
   * @returns A list of tenant team member information matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_TEAM_MEMBER_PATTERN)
  async findAllByFilters(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return await this.tenantTeamMemberService.findAllByFilter(
      requestingUserId,
      filtersDto,
    );
  }

  /**
   * Retrieves all member information for a specific tenant team.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team.
   * @returns A list of tenant team member entities.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_BY_TENANT_TEAM_ID_PATTERN)
  async findAllByTenantTeamId(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantTeamId', ParseIntPipe) tenantTeamId: number,
  ): Promise<TenantTeamMemberEntity[]> {
    return this.tenantTeamMemberService.findAllByTenantTeamId(
      requestingUserId,
      tenantTeamId,
    );
  }

  /**
   * Updates tenant team member information.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team.
   * @param updateTenantTeamMemberDto - Data transfer object containing updated member info details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_TEAM_MEMBER_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateMember(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantTeamId', ParseIntPipe) tenantTeamId: number,
    @Payload('data') updateTenantTeamMemberDto: UpdateTenantTeamMemberDto,
  ): Promise<UpdateResult> {
    return this.tenantTeamMemberService.update(
      requestingUserId,
      tenantTeamId,
      updateTenantTeamMemberDto.tenantTeamMemberId,
      updateTenantTeamMemberDto,
    );
  }

  /**
   * Deletes tenant team member information by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team.
   * @param id - ID of the member info to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_TEAM_MEMBER_PATTERN)
  async removeMember(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantTeamId', ParseIntPipe) tenantTeamId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantTeamMemberService.remove(
      requestingUserId,
      tenantTeamId,
      id,
    );
  }
}
