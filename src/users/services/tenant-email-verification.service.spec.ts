import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../entities/user.entity';
import { EventsService } from '../../events/events.service';
import { PlatformEventFlagsService } from '../../events/config/platform-event-flags.service';
import { NotificationUrlBuilderService } from '../../notifications/services/notification-url-builder.service';
import { ConfigVerificationService } from '../../config_objects/verification/config-verification.service';
import { ConfigObjectVerificationTokenService } from '../../config_objects/verification/config-object-verification-token.service';
import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import { TenantEmailVerificationService } from './tenant-email-verification.service';

describe('TenantEmailVerificationService', () => {
  let service: TenantEmailVerificationService;
  let userRepo: { findOneByOrFail: jest.Mock };
  let verificationTokenService: { issueVerificationToken: jest.Mock };
  let configVerificationService: { verifyConfigObjectEmail: jest.Mock };
  let eventsService: { emitAsync: jest.Mock; emitWithLogs: jest.Mock };
  let urlBuilder: {
    buildVerificationUrl: jest.Mock;
    buildLoginUrl: jest.Mock;
  };
  let platformEventFlags: {
    isEventBusEnabled: jest.Mock;
    isNotificationRulesEnabled: jest.Mock;
  };

  beforeEach(async () => {
    userRepo = { findOneByOrFail: jest.fn() };
    verificationTokenService = {
      issueVerificationToken: jest.fn().mockResolvedValue({
        objectType: 'user',
        coreId: 5,
        token: 'secure-token',
        expiresAt: '2099-01-01T00:00:00.000Z',
      }),
    };
    configVerificationService = {
      verifyConfigObjectEmail: jest.fn().mockResolvedValue({
        success: true,
        objectType: 'user',
        coreId: 5,
        emailVerified: true,
      }),
    };
    eventsService = {
      emitAsync: jest.fn().mockResolvedValue(undefined),
      emitWithLogs: jest.fn().mockResolvedValue(undefined),
    };
    urlBuilder = {
      buildVerificationUrl: jest
        .fn()
        .mockReturnValue('https://app.example.com/verify-tenant-user?token=secure-token'),
      buildLoginUrl: jest.fn().mockReturnValue('https://app.example.com/signin'),
    };
    platformEventFlags = {
      isEventBusEnabled: jest.fn().mockReturnValue(true),
      isNotificationRulesEnabled: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantEmailVerificationService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: EventsService, useValue: eventsService },
        { provide: NotificationUrlBuilderService, useValue: urlBuilder },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(24) },
        },
        { provide: PlatformEventFlagsService, useValue: platformEventFlags },
        {
          provide: ConfigVerificationService,
          useValue: configVerificationService,
        },
        {
          provide: ConfigObjectVerificationTokenService,
          useValue: verificationTokenService,
        },
      ],
    }).compile();

    service = module.get(TenantEmailVerificationService);
  });

  it('issues token via generic engine and emits verification requested event', async () => {
    userRepo.findOneByOrFail.mockResolvedValue({
      userId: 5,
      email: 'user@example.com',
    });

    const result = await service.requestVerification({ userId: 5 });

    expect(verificationTokenService.issueVerificationToken).toHaveBeenCalledWith({
      objectType: 'user',
      coreId: 5,
      ttlHours: 24,
    });
    expect(eventsService.emitAsync).toHaveBeenCalledWith(
      PLATFORM_EVENT_NAMES.TENANT_EMAIL_VERIFICATION_REQUESTED,
      expect.objectContaining({
        data: expect.objectContaining({
          verificationToken: 'secure-token',
          objectType: 'user',
        }),
      }),
    );
    expect(result).toEqual({
      userId: 5,
      email: 'user@example.com',
      verified: false,
    });
  });

  it('verifies via generic RPC and emits tenant_email_verified', async () => {
    userRepo.findOneByOrFail.mockResolvedValue({
      userId: 5,
      email: 'user@example.com',
    });

    const result = await service.verifyByToken('secure-token');

    expect(configVerificationService.verifyConfigObjectEmail).toHaveBeenCalledWith({
      objectType: 'user',
      token: 'secure-token',
    });
    expect(eventsService.emitAsync).toHaveBeenCalledWith(
      PLATFORM_EVENT_NAMES.TENANT_EMAIL_VERIFIED,
      expect.objectContaining({
        data: expect.objectContaining({
          loginUrl: 'https://app.example.com/signin',
        }),
      }),
    );
    expect(result.verified).toBe(true);
  });

  it('throws when generic verification fails', async () => {
    configVerificationService.verifyConfigObjectEmail.mockResolvedValue({
      success: false,
      message: 'Invalid or expired verification token.',
    });

    await expect(service.verifyByToken('bad')).rejects.toThrow(
      'Invalid or expired verification token.',
    );
  });
});
