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
  MICROSERVICE_RESEND_TENANT_USER_INVITATION_PATTERN,
  MICROSERVICE_ACCEPT_TENANT_USER_INVITATION_PATTERN,
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
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant for which the invitation is being created.
   * @param createTenantUserInvitationDto - Data transfer object containing invitation details.
   * @returns The created tenant user invitation entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TENANT_USER_INVITATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createTenantUserInvitation(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data')
    createTenantUserInvitationDto: CreateTenantUserInvitationDto,
  ): Promise<TenantUserInvitationsEntity> {
    return this.tenantUserInvitationsService.create(
      userId,
      createTenantUserInvitationDto,
    );
  }

  /**
   * Retrieves a single tenant user invitation by ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the invitation to retrieve.
   * @returns The tenant user invitation entity.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TENANT_USER_INVITATION_PATTERN)
  async findOneTenantUserInvitation(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantUserInvitationsEntity> {
    return this.tenantUserInvitationsService.findOne(userId, tenantId, id);
  }

  /**
   * Retrieves all tenant user invitations based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying invitations.
   * @returns A list of tenant user invitations matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TENANT_USER_INVITATIONS_PATTERN)
  async findAllByFilters(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return await this.tenantUserInvitationsService.findAllByFilter(
      userId,
      filtersDto,
    );
  }

  /**
   * Updates tenant user invitation information.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param updateTenantUserInvitationDto - Data transfer object containing updated invitation details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TENANT_USER_INVITATION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateTenantUserInvitation(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data')
    updateTenantUserInvitationDto: UpdateTenantUserInvitationDto,
  ): Promise<UpdateResult> {
    return this.tenantUserInvitationsService.update(
      userId,
      tenantId,
      updateTenantUserInvitationDto.invitationId,
      updateTenantUserInvitationDto,
    );
  }

  /**
   * Deletes a tenant user invitation by ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the invitation to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TENANT_USER_INVITATION_PATTERN)
  async removeTenantUserInvitation(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantUserInvitationsService.remove(userId, tenantId, id);
  }

  @MessagePattern(MICROSERVICE_RESEND_TENANT_USER_INVITATION_PATTERN)
  async resendTenantUserInvitation(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantUserInvitationsEntity> {
    return this.tenantUserInvitationsService.resend(userId, tenantId, id);
  }

  @MessagePattern(MICROSERVICE_ACCEPT_TENANT_USER_INVITATION_PATTERN)
  async acceptTenantUserInvitation(
    @Payload('data') data: { token?: string },
  ): Promise<TenantUserInvitationsEntity> {
    return this.tenantUserInvitationsService.acceptByToken(String(data?.token ?? ''));
  }
}
