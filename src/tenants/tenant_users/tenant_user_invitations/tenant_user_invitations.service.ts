import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUserInvitationsEntity } from './entities/tenant_user_invitation.entity';
import { CreateTenantUserInvitationDto } from './dto/create-tenant_user_invitation.dto';
import { UpdateTenantUserInvitationDto } from './dto/update-tenant_user_invitation.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class TenantUserInvitationsService {
  constructor(
    @InjectRepository(TenantUserInvitationsEntity)
    private readonly tenantUserInvitationsRepository: Repository<TenantUserInvitationsEntity>,
  ) {}

  /**
   * Creates a new tenant user invitation record.
   * @param requestingUserId - ID of the user making the request.
   * @param createTenantUserInvitationDto - Data transfer object containing invitation details.
   * @returns The created invitation entity.
   */
  async create(
    requestingUserId: number,
    createTenantUserInvitationDto: CreateTenantUserInvitationDto,
  ): Promise<TenantUserInvitationsEntity> {
    // Optionally validate requestingUserId permissions here
    return await this.tenantUserInvitationsRepository.save(
      this.tenantUserInvitationsRepository.create(
        createTenantUserInvitationDto,
      ),
    );
  }

  /**
   * Retrieves all invitations for a specific tenant ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @returns Array of invitation entities.
   */
  async findAllByTenantId(
    requestingUserId: number,
    tenantId: number,
  ): Promise<TenantUserInvitationsEntity[]> {
    // Optionally validate requestingUserId permissions here
    const invitations = await this.tenantUserInvitationsRepository.find({
      where: { tenantId },
    });

    if (invitations.length === 0) {
      throw new RpcException('No invitations found for the specified tenant.');
    }

    return invitations;
  }

  /**
   * Retrieves tenant user invitation records based on filters.
   * @param requestingUserId - ID of the user making the request.
   * @param filtersDto - Filters for querying tenant user invitation records.
   * @returns Object containing tenant user invitation records and pagination details.
   */
  async findAllByFilter(
    requestingUserId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [tenantUserInvitations, total] =
      await this.tenantUserInvitationsRepository.findAndCount(findQuery);

    if (tenantUserInvitations.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUserInvitationsEntity.name,
        ),
      );
    }

    return {
      tenantUserInvitationsRecords: tenantUserInvitations,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Builds a query object for filtering tenant user records.
   * Applies LIKE queries on tenant user fields and user entity fields.
   * @param filtersDto - Filters for querying tenant user records.
   * @returns Query object for filtering.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [
        { user: { first_name: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's first_name field
        { user: { last_name: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's last_name field
        { user: { username: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's username field
        { user: { email: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's email field
        { tenant: { name: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on tenant entity's name field
      ];
    }

    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page || 1;
      filtersDto.limit = Math.min(filtersDto.limit, 10);

      query.take = filtersDto.limit;
      query.skip = (filtersDto.page - 1) * filtersDto.limit;
    }

    return query;
  }

  /**
   * Retrieves a single invitation record by ID and tenant ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the invitation.
   * @returns The invitation entity.
   */
  async findOne(
    requestingUserId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantUserInvitationsEntity> {
    // Optionally validate requestingUserId permissions here
    const invitation = await this.tenantUserInvitationsRepository.findOne({
      where: { invitationId: id, tenantId },
    });

    if (!invitation) {
      throw new RpcException('Invitation not found.');
    }

    return invitation;
  }

  /**
   * Updates an invitation record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the invitation.
   * @param updateTenantUserInvitationDto - Data transfer object containing updated invitation details.
   * @returns The result of the update operation.
   */
  async update(
    requestingUserId: number,
    tenantId: number,
    id: number,
    updateTenantUserInvitationDto: UpdateTenantUserInvitationDto,
  ): Promise<UpdateResult> {
    // Optionally validate requestingUserId permissions here
    const invitation = await this.tenantUserInvitationsRepository.findOne({
      where: { invitationId: id, tenantId },
    });

    if (!invitation) {
      throw new RpcException('Invitation not found.');
    }

    return await this.tenantUserInvitationsRepository.update(
      id,
      updateTenantUserInvitationDto,
    );
  }

  /**
   * Deletes an invitation record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the invitation.
   * @returns The result of the delete operation.
   */
  async remove(
    requestingUserId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    // Optionally validate requestingUserId permissions here
    const invitation = await this.tenantUserInvitationsRepository.findOne({
      where: { invitationId: id, tenantId },
    });

    if (!invitation) {
      throw new RpcException('Invitation not found.');
    }

    return await this.tenantUserInvitationsRepository.delete({
      invitationId: id,
      tenantId,
    });
  }

  /**
   * Builds pagination details for the filtered records.
   * @param filtersDto - Filters for querying tenant user records.
   * @param total - Total number of records matching the filters.
   * @returns Pagination details.
   */
  private buildPagination(
    filtersDto: FiltersDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filtersDto.page || 1,
      limit: filtersDto.limit || 10,
    };
  }
}
