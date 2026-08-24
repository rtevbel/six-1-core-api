import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUserInvitationsEntity } from './entities/tenant_user_invitation.entity';
import { CreateTenantUserInvitationDto } from './dto/create-tenant_user_invitation.dto';
import { UpdateTenantUserInvitationDto } from './dto/update-tenant_user_invitation.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import { EventsService } from '../../../events/events.service';
import { NotificationUrlBuilderService } from '../../../notifications/services/notification-url-builder.service';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../../common/runtime-v2-list-pagination';


import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';
import { applyTenantUserInvitationCreateDefaults } from './invitation-create.defaults';

@Injectable()
export class TenantUserInvitationsService {
  constructor(
    @InjectRepository(TenantUserInvitationsEntity)
    private readonly tenantUserInvitationsRepository: Repository<TenantUserInvitationsEntity>,
    private readonly eventsService: EventsService,
    private readonly urlBuilder: NotificationUrlBuilderService,
  ) {}

  /**
   * Creates a new tenant user invitation record.
   * @param userId - ID of the user making the request.
   * @param createTenantUserInvitationDto - Data transfer object containing invitation details.
   * @returns The created invitation entity.
   */
  async create(
    userId: number,
    createTenantUserInvitationDto: CreateTenantUserInvitationDto,
  ): Promise<TenantUserInvitationsEntity> {
    const prepared = applyTenantUserInvitationCreateDefaults({
      tenantId: createTenantUserInvitationDto.tenantId,
      actorUserId: userId,
      email: createTenantUserInvitationDto.email,
      roleId: createTenantUserInvitationDto.roleId,
      token: createTenantUserInvitationDto.token,
      status: createTenantUserInvitationDto.status,
      invitedBy: createTenantUserInvitationDto.invitedBy,
      userId: createTenantUserInvitationDto.userId,
      expiresAt: createTenantUserInvitationDto.expiresAt,
    });

    const invitation = await this.tenantUserInvitationsRepository.save(
      this.tenantUserInvitationsRepository.create(prepared),
    );

    // Fire tenant_user_invited event to drive notifications (email/SMS/push)
    await this.emitTenantUserInvitedEvent(invitation);

    return invitation;
  }

  /**
   * Retrieves tenant user invitation records based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying tenant user invitation records.
   * @returns Object containing tenant user invitation records and pagination details.
   */
  async findAllByFilter(
    userId: number,
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

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: tenantUserInvitations,
      tenantUserInvitationsRecords: tenantUserInvitations,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
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

    query.where = { tenantId: filtersDto.tenantId }; // Filter by tenantId

    if (filtersDto.search) {
      query.where = [
        { user: { first_name: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's first_name field
        { user: { last_name: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's last_name field
        { user: { username: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's username field
        { user: { email: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on user entity's email field
        { tenant: { name: Like(`%${filtersDto.search}%`) } }, // Apply LIKE query on tenant entity's name field
        { token: Like(`%${filtersDto.search}%`) }, // Apply LIKE query on token field
        { status: Like(`%${filtersDto.search}%`) }, // Apply LIKE query on status field
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
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the invitation.
   * @returns The invitation entity.
   */
  async findOne(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantUserInvitationsEntity> {
    // Optionally validate userId permissions here
    const invitation = await this.tenantUserInvitationsRepository.findOne({
      where: { invitationId: id, tenantId },
    });

    if (!invitation) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserInvitationsEntity.name,
        ),
      );
    }

    return invitation;
  }

  /**
   * Updates an invitation record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the invitation.
   * @param updateTenantUserInvitationDto - Data transfer object containing updated invitation details.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
    tenantId: number,
    id: number,
    updateTenantUserInvitationDto: UpdateTenantUserInvitationDto,
  ): Promise<UpdateResult> {
    // Optionally validate userId permissions here
    const invitation = await this.tenantUserInvitationsRepository.findOne({
      where: { invitationId: id, tenantId },
    });

    if (!invitation) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserInvitationsEntity.name,
        ),
      );
    }

    const previousStatus = invitation.status;

    const result = await this.tenantUserInvitationsRepository.update(
      id,
      updateTenantUserInvitationDto,
    );

    // If status transitioned to accepted, emit accepted event.
    if (
      updateTenantUserInvitationDto.status === 'accepted' &&
      previousStatus !== 'accepted'
    ) {
      const updated = await this.tenantUserInvitationsRepository.findOne({
        where: { invitationId: id, tenantId },
      });
      if (updated) {
        await this.emitTenantUserInvitationAcceptedEvent(updated);
      }
    }

    return result;
  }

  /**
   * Deletes an invitation record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the invitation.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    // Optionally validate userId permissions here
    const invitation = await this.tenantUserInvitationsRepository.findOne({
      where: { invitationId: id, tenantId },
    });

    if (!invitation) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserInvitationsEntity.name,
        ),
      );
    }

    return await this.tenantUserInvitationsRepository.delete({
      invitationId: id,
      tenantId,
    });
  }

  /**
   * Re-sends a pending invitation (rotates token and re-emits tenant_user_invited).
   */
  async resend(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantUserInvitationsEntity> {
    const invitation = await this.tenantUserInvitationsRepository.findOne({
      where: { invitationId: id, tenantId },
    });
    if (!invitation) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserInvitationsEntity.name,
        ),
      );
    }
    if (invitation.status !== 'pending') {
      throw new RpcException('Only pending invitations can be resent.');
    }

    invitation.token = applyTenantUserInvitationCreateDefaults({
      tenantId,
      actorUserId: userId,
      email: invitation.email,
      roleId: invitation.roleId,
    }).token;
    invitation.invitedBy = userId;
    const saved = await this.tenantUserInvitationsRepository.save(invitation);
    await this.emitTenantUserInvitedEvent(saved);
    return saved;
  }

  /**
   * Accepts an invitation from the public token link.
   */
  async acceptByToken(token: string): Promise<TenantUserInvitationsEntity> {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new RpcException('Invitation token is required.');
    }
    const invitation = await this.tenantUserInvitationsRepository.findOne({
      where: { token: trimmed },
    });
    if (!invitation) {
      throw new RpcException('Invalid invitation token.');
    }
    if (invitation.status === 'accepted') {
      return invitation;
    }
    if (invitation.status !== 'pending') {
      throw new RpcException('This invitation is no longer pending.');
    }
    if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
      throw new RpcException('This invitation has expired.');
    }

    invitation.status = 'accepted';
    const saved = await this.tenantUserInvitationsRepository.save(invitation);
    await this.emitTenantUserInvitationAcceptedEvent(saved);
    return saved;
  }

  /**
   * Emits tenant_user_invited event for a newly created invitation.
   */
  private async emitTenantUserInvitedEvent(
    invitation: TenantUserInvitationsEntity,
  ): Promise<void> {
    const withRelations =
      await this.tenantUserInvitationsRepository.findOne({
        where: { invitationId: invitation.invitationId },
        relations: ['tenant', 'role', 'invitedByUser', 'invitedByUser.user'],
      });
    if (!withRelations) return;

    const tenantName = withRelations.tenant?.name ?? 'Your tenant';
    const inviterUser = withRelations.invitedByUser?.user;
    const inviterName =
      inviterUser?.displayName ||
      [inviterUser?.firstName, inviterUser?.lastName].filter(Boolean).join(' ') ||
      inviterUser?.email ||
      'Someone';
    const userRole =
      (withRelations.role as any)?.descriptions?.[0]?.name ??
      (withRelations.role as any)?.name ??
      `Role #${withRelations.roleId}`;

    const invitationUrl =
      this.urlBuilder.buildTenantUserInvitationUrl(withRelations.token);

    let expiryDays = 0;
    if (withRelations.expiresAt && withRelations.invitedAt) {
      const ms =
        withRelations.expiresAt.getTime() - withRelations.invitedAt.getTime();
      expiryDays = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }

    await this.eventsService.emitWithLogs('tenant_user_invited', {
      actorId: withRelations.invitedBy,
      recipientIds:
        withRelations.userId && withRelations.userId > 0
          ? [withRelations.userId]
          : [],
      entity: {
        entityId: withRelations.invitationId,
        entityType: 'tenant_user_invitation',
      },
      data: {
        tenantName,
        inviterName,
        userRole,
        invitationUrl,
        expiryDays,
        emailAddress: withRelations.email,
      },
    });
  }

  /**
   * Emits tenant_user_invitation_accepted event when an invite is accepted.
   */
  private async emitTenantUserInvitationAcceptedEvent(
    invitation: TenantUserInvitationsEntity,
  ): Promise<void> {
    const withRelations =
      await this.tenantUserInvitationsRepository.findOne({
        where: { invitationId: invitation.invitationId },
        relations: ['tenant', 'role', 'user'],
      });
    if (!withRelations) return;

    const tenantName = withRelations.tenant?.name ?? 'Your tenant';
    const user =
      (withRelations as any).user ??
      null;
    const userName =
      user?.displayName ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      user?.email ||
      'User';
    const userRole =
      (withRelations.role as any)?.descriptions?.[0]?.name ??
      (withRelations.role as any)?.name ??
      `Role #${withRelations.roleId}`;

    await this.eventsService.emitWithLogs(
      'tenant_user_invitation_accepted',
      {
        actorId: withRelations.userId || withRelations.invitedBy,
        recipientIds: [withRelations.invitedBy],
        entity: {
          entityId: withRelations.invitationId,
          entityType: 'tenant_user_invitation',
        },
        data: {
          userName,
          tenantName,
          userRole,
        },
      },
    );
  }

  /**
   * Builds pagination details for the filtered records.
   * @param filtersDto - Filters for querying tenant user records.
   * @param total - Total number of records matching the filters.
   * @returns Pagination details.
   */
  private buildPagination(
    filtersDto: any,
    total: number,
  ): RuntimeV2ListPagination {
    return buildRuntimeV2ListPagination(
      filtersDto.page,
      filtersDto.limit,
      total,
      10,
    );
  }
}
