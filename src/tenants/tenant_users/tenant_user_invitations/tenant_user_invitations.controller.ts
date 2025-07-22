import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantUserInvitationsService } from './tenant_user_invitations.service';
import { CreateTenantUserInvitationDto } from './dto/create-tenant_user_invitation.dto';
import { UpdateTenantUserInvitationDto } from './dto/update-tenant_user_invitation.dto';
import { TenantUserInvitationsEntity } from './entities/tenant_user_invitation.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TENANT_USER_INVITATION_PATTERN,
  MICROSERVICE_FIND_ALL_TENANT_USER_INVITATIONS_PATTERN,
  MICROSERVICE_FIND_ONE_TENANT_USER_INVITATION_PATTERN,
  MICROSERVICE_UPDATE_TENANT_USER_INVITATION_PATTERN,
  MICROSERVICE_REMOVE_TENANT_USER_INVITATION_PATTERN,
  MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN,
} from './constants';

/**
 * Controller for managing tenant user invitations.
 */
@Controller('tenant-user-invitations')
export class TenantUserInvitationsController {
  constructor(
    private readonly tenantUserInvitationsService: TenantUserInvitationsService,
  ) {}

  /**
   * Handles the creation of a tenant user invitation.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant for which the invitation is being created.
   * @param createTenantUserInvitationDto - Data transfer object containing invitation details.
   * @returns The created tenant user invitation entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_USER_INVITATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createTenantUserInvitation(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data')
    createTenantUserInvitationDto: CreateTenantUserInvitationDto,
  ): Promise<TenantUserInvitationsEntity> {
    return this.tenantUserInvitationsService.create(
      requestingUserId,
      createTenantUserInvitationDto,
    );
  }

  /**
   * Retrieves a single tenant user invitation by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the invitation to retrieve.
   * @returns The tenant user invitation entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_USER_INVITATION_PATTERN)
  async findOneTenantUserInvitation(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantUserInvitationsEntity> {
    return this.tenantUserInvitationsService.findOne(
      requestingUserId,
      tenantId,
      id,
    );
  }

  /**
   * Retrieves all tenant user invitations based on filters.
   * @param requestingUserId - ID of the user making the request.
   * @param filtersDto - Filters for querying invitations.
   * @returns A list of tenant user invitations matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_USER_INVITATIONS_PATTERN)
  async findAllByFilters(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return await this.tenantUserInvitationsService.findAllByFilter(
      requestingUserId,
      filtersDto,
    );
  }

  /**
   * Retrieves all invitations for a specific tenant.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @returns A list of tenant user invitation entities.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN)
  async findAllByTenantId(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<TenantUserInvitationsEntity[]> {
    return this.tenantUserInvitationsService.findAllByTenantId(
      requestingUserId,
      tenantId,
    );
  }

  /**
   * Updates tenant user invitation information.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param updateTenantUserInvitationDto - Data transfer object containing updated invitation details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_USER_INVITATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateTenantUserInvitation(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data')
    updateTenantUserInvitationDto: UpdateTenantUserInvitationDto,
  ): Promise<UpdateResult> {
    return this.tenantUserInvitationsService.update(
      requestingUserId,
      tenantId,
      updateTenantUserInvitationDto.invitationId,
      updateTenantUserInvitationDto,
    );
  }

  /**
   * Deletes a tenant user invitation by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the invitation to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_USER_INVITATION_PATTERN)
  async removeTenantUserInvitation(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantUserInvitationsService.remove(
      requestingUserId,
      tenantId,
      id,
    );
  }
}
