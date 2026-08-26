import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantUserInvitationsService } from './tenant_user_invitations.service';
import { TenantUserInvitationsEntity } from './entities/tenant_user_invitation.entity';
import { TenantUsersEntity } from '../entities/tenant_user.entity';
import { TenantUserRoleEntity } from '../tenant_user_roles/entities/tenant_user_role.entity';
import { UserEntity } from '../../../users/entities/user.entity';
import { EventsService } from '../../../events/events.service';
import { PlatformEventFlagsService } from '../../../events/config/platform-event-flags.service';
import { NotificationUrlBuilderService } from '../../../notifications/services/notification-url-builder.service';
import { PLATFORM_EVENT_NAMES } from '../../../events/constants/platform-event-names.constants';

describe('TenantUserInvitationsService', () => {
  let service: TenantUserInvitationsService;
  let invitationRepo: { findOne: jest.Mock };
  let eventsService: { emitAsync: jest.Mock; emitWithLogs: jest.Mock };
  let urlBuilder: { buildTenantUserInvitationUrl: jest.Mock };
  let platformEventFlags: {
    isEventBusEnabled: jest.Mock;
    isNotificationRulesEnabled: jest.Mock;
  };

  beforeEach(async () => {
    invitationRepo = { findOne: jest.fn() };
    eventsService = {
      emitAsync: jest.fn().mockResolvedValue(undefined),
      emitWithLogs: jest.fn().mockResolvedValue(undefined),
    };
    urlBuilder = {
      buildTenantUserInvitationUrl: jest
        .fn()
        .mockReturnValue(
          'http://localhost:3009/accept-invitation?token=abc',
        ),
    };
    platformEventFlags = {
      isEventBusEnabled: jest.fn().mockReturnValue(true),
      isNotificationRulesEnabled: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantUserInvitationsService,
        {
          provide: getRepositoryToken(TenantUserInvitationsEntity),
          useValue: {
            findOne: invitationRepo.findOne,
            save: jest.fn(),
            manager: { transaction: jest.fn() },
          },
        },
        {
          provide: getRepositoryToken(TenantUsersEntity),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(TenantUserRoleEntity),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        { provide: EventsService, useValue: eventsService },
        {
          provide: NotificationUrlBuilderService,
          useValue: urlBuilder,
        },
        { provide: PlatformEventFlagsService, useValue: platformEventFlags },
      ],
    }).compile();

    service = module.get<TenantUserInvitationsService>(
      TenantUserInvitationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('emits canonical tenant_user_invited to the invitee email via the rule engine', async () => {
    invitationRepo.findOne.mockResolvedValue({
      invitationId: 14,
      tenantId: 20,
      email: 'invitee@example.com',
      invitedBy: 9,
      invitedAt: new Date('2026-08-25T00:00:00.000Z'),
      expiresAt: new Date('2026-09-01T00:00:00.000Z'),
      token: 'abc',
      tenant: { name: 'Acme HVAC' },
      role: { name: 'Admin' },
      invitedByUser: {
        userId: 20,
        user: { userId: 20, displayName: 'Avery Cole' },
      },
    });

    await (service as any).emitTenantUserInvitedEvent({ invitationId: 14 });

    expect(eventsService.emitAsync).toHaveBeenCalledWith(
      PLATFORM_EVENT_NAMES.TENANT_USER_INVITED,
      expect.objectContaining({
        actorId: 20,
        userId: 20,
        tenantId: 20,
        data: expect.objectContaining({
          tenantName: 'Acme HVAC',
          inviterName: 'Avery Cole',
          emailAddress: 'invitee@example.com',
          invitationUrl:
            'http://localhost:3009/accept-invitation?token=abc',
        }),
      }),
    );
    expect(eventsService.emitWithLogs).not.toHaveBeenCalled();
  });

  it('emits invitation accepted to the inviter platform user id', async () => {
    invitationRepo.findOne.mockResolvedValue({
      invitationId: 14,
      tenantId: 20,
      invitedBy: 9,
      tenant: { name: 'Acme HVAC' },
      role: { name: 'Admin' },
      user: { displayName: 'Riley Patel' },
      invitedByUser: { userId: 20 },
    });

    await (service as any).emitTenantUserInvitationAcceptedEvent({
      invitationId: 14,
    });

    expect(eventsService.emitAsync).toHaveBeenCalledWith(
      PLATFORM_EVENT_NAMES.TENANT_USER_INVITATION_ACCEPTED,
      expect.objectContaining({
        actorId: 20,
        userId: 20,
        tenantId: 20,
        recipientIds: [20],
        data: expect.objectContaining({
          userName: 'Riley Patel',
          tenantName: 'Acme HVAC',
        }),
      }),
    );
  });
});
