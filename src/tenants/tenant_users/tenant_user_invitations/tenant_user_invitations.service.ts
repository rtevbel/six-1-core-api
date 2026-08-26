import { Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import { Repository, UpdateResult, DeleteResult, Like, EntityManager, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUserInvitationsEntity } from './entities/tenant_user_invitation.entity';
import { CreateTenantUserInvitationDto } from './dto/create-tenant_user_invitation.dto';
import { UpdateTenantUserInvitationDto } from './dto/update-tenant_user_invitation.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import { EventsService } from '../../../events/events.service';
import { PLATFORM_EVENT_NAMES } from '../../../events/constants/platform-event-names.constants';
import { PlatformEventFlagsService } from '../../../events/config/platform-event-flags.service';
import type { EventEmitOptions } from '../../../events/interfaces/event-emit-options.interface';
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
import { resolveInviterTenantUserId } from './invitation-inviter.resolve';
import type {
  AcceptInvitationProfile,
  InvitationAcceptPreview,
} from './invitation-accept.types';
import { TenantUsersEntity } from '../entities/tenant_user.entity';
import { TenantUserRoleEntity } from '../tenant_user_roles/entities/tenant_user_role.entity';
import { UserEntity } from '../../../users/entities/user.entity';

const DEFAULT_TENANT_USER_STATUS_ID = 1;

@Injectable()
export class TenantUserInvitationsService {
  constructor(
    @InjectRepository(TenantUserInvitationsEntity)
    private readonly tenantUserInvitationsRepository: Repository<TenantUserInvitationsEntity>,
    @InjectRepository(TenantUsersEntity)
    private readonly tenantUsersRepository: Repository<TenantUsersEntity>,
    @InjectRepository(TenantUserRoleEntity)
    private readonly tenantUserRoleRepository: Repository<TenantUserRoleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly eventsService: EventsService,
    private readonly urlBuilder: NotificationUrlBuilderService,
    private readonly platformEventFlags: PlatformEventFlagsService,
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
    const invitedBy = await this.resolveInviterTenantUserIdOrThrow(
      userId,
      createTenantUserInvitationDto.tenantId,
      createTenantUserInvitationDto.invitedBy,
    );
    const prepared = applyTenantUserInvitationCreateDefaults({
      tenantId: createTenantUserInvitationDto.tenantId,
      actorUserId: userId,
      email: createTenantUserInvitationDto.email,
      roleId: createTenantUserInvitationDto.roleId,
      token: createTenantUserInvitationDto.token,
      status: createTenantUserInvitationDto.status,
      invitedBy,
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

    const hydrated = await this.hydrateInvitationRows(tenantUserInvitations);

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: hydrated,
      tenantUserInvitationsRecords: hydrated,
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

    const [hydrated] = await this.hydrateInvitationRows([invitation]);
    return hydrated ?? invitation;
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
        await this.provisionTenantUserFromInvitation(updated);
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
   * @returns The result of the deletion operation.
   */
  async remove(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
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
    invitation.invitedBy = await this.resolveInviterTenantUserIdOrThrow(
      userId,
      tenantId,
      invitation.invitedBy,
    );
    const saved = await this.tenantUserInvitationsRepository.save(invitation);
    await this.emitTenantUserInvitedEvent(saved);
    return saved;
  }

  async previewByToken(token: string): Promise<InvitationAcceptPreview> {
    const invitation = await this.loadInvitationByToken(token);
    const existingUser = await this.userRepository.findOne({
      where: { email: invitation.email.trim().toLowerCase() },
    });
    return {
      email: invitation.email,
      tenantName: invitation.tenant?.name ?? 'Your tenant',
      roleName: this.roleDisplayName(invitation),
      status: invitation.status,
      expired: this.isInvitationExpired(invitation),
      requiresAccountSetup: existingUser == null,
    };
  }

  /**
   * Accepts an invitation from the public token link and completes tenant user setup.
   */
  async acceptByToken(
    token: string,
    profile?: AcceptInvitationProfile,
  ): Promise<TenantUserInvitationsEntity> {
    const invitation = await this.loadInvitationByToken(token);
    const wasPending = invitation.status === 'pending';
    if (invitation.status === 'accepted') {
      await this.provisionTenantUserFromInvitation(invitation, profile);
      return invitation;
    }
    if (invitation.status !== 'pending') {
      throw new RpcException('This invitation is no longer pending.');
    }
    if (this.isInvitationExpired(invitation)) {
      throw new RpcException('This invitation has expired.');
    }

    await this.provisionTenantUserFromInvitation(invitation, profile, {
      markAccepted: true,
    });
    if (wasPending) {
      await this.emitTenantUserInvitationAcceptedEvent(invitation);
    }
    return invitation;
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
    const userRole = this.roleDisplayName(withRelations);

    const invitationUrl =
      this.urlBuilder.buildTenantUserInvitationUrl(withRelations.token);

    let expiryDays = 0;
    if (withRelations.expiresAt && withRelations.invitedAt) {
      const ms =
        withRelations.expiresAt.getTime() - withRelations.invitedAt.getTime();
      expiryDays = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }

    await this.emitInvitationNotificationEvent(
      PLATFORM_EVENT_NAMES.TENANT_USER_INVITED,
      {
        actorUserId: this.resolveInviterPlatformUserId(withRelations),
        tenantId: withRelations.tenantId,
        invitationId: withRelations.invitationId,
        data: {
          tenantName,
          inviterName,
          userRole,
          invitationUrl,
          expiryDays,
          emailAddress: withRelations.email,
        },
      },
    );
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
        relations: [
          'tenant',
          'role',
          'user',
          'invitedByUser',
          'invitedByUser.user',
        ],
      });
    if (!withRelations) return;

    const tenantName = withRelations.tenant?.name ?? 'Your tenant';
    const user = withRelations.user ?? null;
    const userName =
      user?.displayName ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      user?.email ||
      'User';
    const userRole = this.roleDisplayName(withRelations);
    const inviterUserId = this.resolveInviterPlatformUserId(withRelations);

    await this.emitInvitationNotificationEvent(
      PLATFORM_EVENT_NAMES.TENANT_USER_INVITATION_ACCEPTED,
      {
        actorUserId: inviterUserId,
        tenantId: withRelations.tenantId,
        invitationId: withRelations.invitationId,
        recipientIds: [inviterUserId],
        data: {
          userName,
          tenantName,
          userRole,
        },
      },
    );
  }

  /**
   * Platform user id of the inviter (`tenant_users.user_id`), not tenant_user_id.
   */
  private resolveInviterPlatformUserId(
    invitation: TenantUserInvitationsEntity,
  ): number {
    const fromMembership = Number(invitation.invitedByUser?.userId);
    if (Number.isFinite(fromMembership) && fromMembership > 0) {
      return fromMembership;
    }
    const fromUser = Number(invitation.invitedByUser?.user?.userId);
    if (Number.isFinite(fromUser) && fromUser > 0) {
      return fromUser;
    }
    return 1;
  }

  private async emitInvitationNotificationEvent(
    eventName: string,
    params: {
      actorUserId: number;
      tenantId: number;
      invitationId: number;
      data: Record<string, unknown>;
      recipientIds?: number[];
    },
  ): Promise<void> {
    const opts: EventEmitOptions<Record<string, unknown>> & {
      actorId: number;
      recipientIds?: number[];
    } = {
      actorId: params.actorUserId,
      userId: params.actorUserId,
      createdBy: params.actorUserId,
      tenantId: params.tenantId,
      correlationId: randomUUID(),
      entity: {
        entityId: params.invitationId,
        entityType: 'tenant_user_invitation',
      },
      data: params.data,
      recipientIds: params.recipientIds ?? [],
    };

    const useRuleEngine =
      this.platformEventFlags.isEventBusEnabled() &&
      this.platformEventFlags.isNotificationRulesEnabled();

    if (useRuleEngine) {
      await this.eventsService.emitAsync(eventName, opts);
      return;
    }

    await this.eventsService.emitWithLogs(eventName, opts);
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

  private async resolveInviterTenantUserIdOrThrow(
    actorUserId: number,
    tenantId: number,
    suggestedInvitedBy?: number | null,
  ): Promise<number> {
    try {
      return await resolveInviterTenantUserId({
        tenantId,
        actorUserId,
        suggestedInvitedBy,
        findByTenantUserId: async (tenantUserId, scopedTenantId) =>
          this.tenantUsersRepository.findOne({
            where: { tenantUserId, tenantId: scopedTenantId },
          }),
        findByUserId: async (userId, scopedTenantId) =>
          this.tenantUsersRepository.findOne({
            where: { userId, tenantId: scopedTenantId },
          }),
      });
    } catch (error) {
      throw new RpcException(
        error instanceof Error
          ? error.message
          : 'Inviter is not a member of this tenant.',
      );
    }
  }

  private async loadInvitationByToken(
    token: string,
  ): Promise<TenantUserInvitationsEntity> {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new RpcException('Invitation token is required.');
    }
    const invitation = await this.tenantUserInvitationsRepository.findOne({
      where: { token: trimmed },
      relations: ['tenant', 'role'],
    });
    if (!invitation) {
      throw new RpcException('Invalid invitation token.');
    }
    return invitation;
  }

  private isInvitationExpired(invitation: TenantUserInvitationsEntity): boolean {
    return Boolean(
      invitation.expiresAt && invitation.expiresAt.getTime() < Date.now(),
    );
  }

  private roleDisplayName(invitation: TenantUserInvitationsEntity): string {
    const role = invitation.role as
      | { name?: string; descriptions?: Array<{ name?: string }> }
      | undefined;
    return (
      role?.descriptions?.[0]?.name ??
      role?.name ??
      `Role #${invitation.roleId}`
    );
  }

  private async hydrateInvitationRows(
    rows: TenantUserInvitationsEntity[],
  ): Promise<TenantUserInvitationsEntity[]> {
    const ids = rows.map((row) => row.invitationId).filter(Boolean);
    if (ids.length === 0) return rows;
    const loaded = await this.tenantUserInvitationsRepository.find({
      where: { invitationId: In(ids) },
      relations: ['role', 'invitedByUser', 'invitedByUser.user'],
    });
    const byId = new Map(loaded.map((row) => [row.invitationId, row]));
    return rows.map((row) => {
      const hydrated = byId.get(row.invitationId) ?? row;
      const nestedUser = hydrated.invitedByUser?.user as
        | { password?: string; displayName?: string; firstName?: string; lastName?: string; email?: string }
        | undefined;
      if (nestedUser) {
        delete nestedUser.password;
        const displayName =
          nestedUser.displayName ||
          [nestedUser.firstName, nestedUser.lastName].filter(Boolean).join(' ') ||
          nestedUser.email;
        if (displayName) {
          (
            hydrated.invitedByUser as TenantUsersEntity & {
              displayName?: string;
            }
          ).displayName = displayName;
        }
      }
      return hydrated;
    });
  }

  private async provisionTenantUserFromInvitation(
    invitation: TenantUserInvitationsEntity,
    profile?: AcceptInvitationProfile,
    options?: { markAccepted?: boolean },
  ): Promise<void> {
    await this.tenantUserInvitationsRepository.manager.transaction(
      async (manager) => {
        const user = await this.findOrCreateInvitedUser(
          manager,
          invitation,
          profile,
        );
        const tenantUser = await this.findOrCreateTenantMembership(
          manager,
          invitation,
          user,
        );
        await this.ensureInvitationRole(
          manager,
          invitation,
          tenantUser,
        );
        invitation.userId = user.userId;
        if (options?.markAccepted) {
          invitation.status = 'accepted';
        }
        await manager.save(TenantUserInvitationsEntity, invitation);
      },
    );
  }

  private async findOrCreateInvitedUser(
    manager: EntityManager,
    invitation: TenantUserInvitationsEntity,
    profile?: AcceptInvitationProfile,
  ): Promise<UserEntity> {
    const email = invitation.email.trim().toLowerCase();
    const users = manager.getRepository(UserEntity);
    const existing = await users.findOne({ where: { email } });
    if (existing) {
      return existing;
    }

    const firstName = profile?.firstName?.trim();
    const lastName = profile?.lastName?.trim();
    const password = profile?.password?.trim();
    if (!firstName || !lastName || !password || password.length < 8) {
      throw new RpcException(
        'Please complete your name and password to finish tenant user setup.',
      );
    }

    const username = await this.allocateUniqueUsername(users, email);
    return users.save(
      users.create({
        email,
        username,
        firstName,
        lastName,
        password,
        displayName: `${firstName} ${lastName}`.trim(),
        status: 1,
      }),
    );
  }

  private async allocateUniqueUsername(
    users: Repository<UserEntity>,
    email: string,
  ): Promise<string> {
    if (!(await users.findOne({ where: { username: email } }))) {
      return email;
    }
    const local = email.split('@')[0] || 'user';
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = `${local}-${randomBytes(3).toString('hex')}`;
      if (!(await users.findOne({ where: { username: candidate } }))) {
        return candidate;
      }
    }
    throw new RpcException('Could not allocate a unique username.');
  }

  private async findOrCreateTenantMembership(
    manager: EntityManager,
    invitation: TenantUserInvitationsEntity,
    user: UserEntity,
  ): Promise<TenantUsersEntity> {
    const tenantUsers = manager.getRepository(TenantUsersEntity);
    const existing = await tenantUsers.findOne({
      where: { tenantId: invitation.tenantId, userId: user.userId },
    });
    if (existing) {
      return existing;
    }

    const createdBy = await this.resolveCreatedByTenantUserId(
      tenantUsers,
      invitation,
    );
    return tenantUsers.save(
      tenantUsers.create({
        tenantId: invitation.tenantId,
        userId: user.userId,
        statusId: DEFAULT_TENANT_USER_STATUS_ID,
        createdBy,
      }),
    );
  }

  private async resolveCreatedByTenantUserId(
    tenantUsers: Repository<TenantUsersEntity>,
    invitation: TenantUserInvitationsEntity,
  ): Promise<number> {
    const invitedBy = await tenantUsers.findOne({
      where: {
        tenantUserId: invitation.invitedBy,
        tenantId: invitation.tenantId,
      },
    });
    if (invitedBy) return invitedBy.tenantUserId;

    const anyMember = await tenantUsers.findOne({
      where: { tenantId: invitation.tenantId },
      order: { tenantUserId: 'ASC' },
    });
    if (anyMember) return anyMember.tenantUserId;

    throw new RpcException(
      'Cannot complete tenant user setup — this tenant has no members to attribute createdBy.',
    );
  }

  private async ensureInvitationRole(
    manager: EntityManager,
    invitation: TenantUserInvitationsEntity,
    tenantUser: TenantUsersEntity,
  ): Promise<void> {
    const roles = manager.getRepository(TenantUserRoleEntity);
    const existing = await roles.findOne({
      where: {
        tenantUserId: tenantUser.tenantUserId,
        roleId: invitation.roleId,
      },
    });
    if (existing) return;

    await roles.save(
      roles.create({
        tenantUserId: tenantUser.tenantUserId,
        roleId: invitation.roleId,
        createdBy: tenantUser.createdBy || invitation.invitedBy,
      }),
    );
  }
}
