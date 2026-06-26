import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { UserEntity } from '../entities/user.entity';
import { EventsService } from '../../events/events.service';
import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import { PlatformEventFlagsService } from '../../events/config/platform-event-flags.service';
import type { EventEmitOptions } from '../../events/interfaces/event-emit-options.interface';
import { NotificationUrlBuilderService } from '../../notifications/services/notification-url-builder.service';
import { ConfigVerificationService } from '../../config_objects/verification/config-verification.service';
import { ConfigObjectVerificationTokenService } from '../../config_objects/verification/config-object-verification-token.service';
import { USER_SYSTEM_TABLE_VERIFICATION_FIELD_MAP } from '../../config_objects/verification/user-verification.constants';

export interface TenantEmailVerificationRequestOptions {
  userId: number;
  tenantName?: string | null;
}

export interface TenantEmailVerificationResult {
  userId: number;
  email: string;
  verified: boolean;
}

const TENANT_USER_VERIFICATION_OBJECT_TYPE = 'user';

/**
 * Tenant email verification — thin wrapper over the generic verification engine (Phase 6).
 *
 * @deprecated Prefer `ConfigObjectVerificationTokenService` + `v0.1_verify_config_object_email`
 * for new integrations; retained for legacy `v0.1_*_tenant_email_*` RPCs until gateway migration.
 */
@Injectable()
export class TenantEmailVerificationService {
  private readonly expiryHours: number;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly eventsService: EventsService,
    private readonly urlBuilder: NotificationUrlBuilderService,
    private readonly configService: ConfigService,
    private readonly platformEventFlags: PlatformEventFlagsService,
    private readonly configVerificationService: ConfigVerificationService,
    private readonly verificationTokenService: ConfigObjectVerificationTokenService,
  ) {
    this.expiryHours =
      Number(this.configService.get('TENANT_EMAIL_VERIFICATION_EXPIRY_HOURS')) ||
      USER_SYSTEM_TABLE_VERIFICATION_FIELD_MAP.defaultTtlHours ||
      24;
  }

  /**
   * Issues a verification token via the generic engine and emits the notification event.
   */
  async requestVerification(
    opts: TenantEmailVerificationRequestOptions,
  ): Promise<TenantEmailVerificationResult> {
    const user = await this.userRepo.findOneByOrFail({ userId: opts.userId });

    const issued = await this.verificationTokenService.issueVerificationToken({
      objectType: TENANT_USER_VERIFICATION_OBJECT_TYPE,
      coreId: user.userId,
      ttlHours: this.expiryHours,
    });

    const verificationUrl = this.urlBuilder.buildVerificationUrl(
      'tenant_user',
      issued.token,
    );
    const loginUrl = this.urlBuilder.buildLoginUrl();

    await this.emitTenantEmailNotification(
      PLATFORM_EVENT_NAMES.TENANT_EMAIL_VERIFICATION_REQUESTED,
      user.userId,
      {
        entity: { entityId: user.userId, entityType: 'user' },
        data: {
          objectType: 'tenant_user',
          verificationToken: issued.token,
          verificationUrl,
          expiryHours: this.expiryHours,
          tenantName: opts.tenantName ?? null,
          loginUrl,
        },
      },
    );

    return {
      userId: user.userId,
      email: user.email,
      verified: false,
    };
  }

  /**
   * Confirms email via generic `verify_email` trigger (`objectType: user`).
   */
  async verifyByToken(token: string): Promise<TenantEmailVerificationResult> {
    const result = await this.configVerificationService.verifyConfigObjectEmail({
      objectType: TENANT_USER_VERIFICATION_OBJECT_TYPE,
      token,
    });

    if (!result.success || result.coreId == null) {
      throw new Error(
        result.message ?? 'Invalid or already used verification token.',
      );
    }

    const user = await this.userRepo.findOneByOrFail({ userId: result.coreId });
    const loginUrl = this.urlBuilder.buildLoginUrl();

    await this.emitTenantEmailNotification(
      PLATFORM_EVENT_NAMES.TENANT_EMAIL_VERIFIED,
      user.userId,
      {
        entity: { entityId: user.userId, entityType: 'user' },
        data: {
          loginUrl,
        },
      },
    );

    return {
      userId: user.userId,
      email: user.email,
      verified: true,
    };
  }

  private async emitTenantEmailNotification(
    eventName: string,
    userId: number,
    opts: Pick<EventEmitOptions, 'entity' | 'data' | 'tenantId'>,
  ): Promise<void> {
    const useRuleEngine =
      this.platformEventFlags.isEventBusEnabled() &&
      this.platformEventFlags.isNotificationRulesEnabled();

    if (useRuleEngine) {
      await this.eventsService.emitAsync(eventName, {
        userId,
        createdBy: userId,
        ...opts,
      });
      return;
    }

    await this.eventsService.emitWithLogs(eventName, {
      actorId: userId,
      recipientIds: [userId],
      entity: opts.entity,
      data: opts.data,
      tenantId: opts.tenantId,
    });
  }
}
