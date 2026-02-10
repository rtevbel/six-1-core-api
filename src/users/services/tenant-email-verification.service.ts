import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { UserEntity } from '../entities/user.entity';
import { EventsService } from '../../events/events.service';
import { NotificationUrlBuilderService } from '../../notifications/services/notification-url-builder.service';

export interface TenantEmailVerificationRequestOptions {
  userId: number;
  tenantName?: string | null;
}

export interface TenantEmailVerificationResult {
  userId: number;
  email: string;
  verified: boolean;
}

/**
 * TenantEmailVerificationService
 *
 * Handles issuing and confirming tenant email verification links.
 * Business logic is kept here; controllers or message handlers should
 * delegate to this service.
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
  ) {
    this.expiryHours =
      Number(this.configService.get('TENANT_EMAIL_VERIFICATION_EXPIRY_HOURS')) ||
      24;
  }

  /**
   * Issues (or reuses) a verification token for the given user
   * and emits the tenant_email_verification event so that
   * notification templates are used for email/SMS/push.
   */
  async requestVerification(
    opts: TenantEmailVerificationRequestOptions,
  ): Promise<TenantEmailVerificationResult> {
    const user = await this.userRepo.findOneByOrFail({ userId: opts.userId });

    // Generate an activation key if missing
    if (!user.activationKey) {
      user.activationKey = this.generateToken();
      await this.userRepo.save(user);
    }

    const verificationUrl = this.urlBuilder.buildEmailVerificationUrl(
      user.activationKey,
    );
    const loginUrl = this.urlBuilder.buildLoginUrl();

    await this.eventsService.emitWithLogs('tenant_email_verification', {
      actorId: user.userId,
      recipientIds: [user.userId],
      entity: { entityId: user.userId, entityType: 'user' },
      data: {
        verificationUrl,
        expiryHours: this.expiryHours,
        tenantName: opts.tenantName ?? null,
        loginUrl,
      },
    });

    return {
      userId: user.userId,
      email: user.email,
      verified: false,
    };
  }

  /**
   * Confirms the user's email using a verification token.
   * Clears activationKey and emits tenant_email_verified.
   */
  async verifyByToken(token: string): Promise<TenantEmailVerificationResult> {
    const user = await this.userRepo.findOne({
      where: { activationKey: token },
    });

    if (!user) {
      throw new Error('Invalid or already used verification token.');
    }

    // Enforce optional expiry based on createdAt
    if (this.expiryHours > 0 && user.createdAt) {
      const expiresAt = new Date(
        user.createdAt.getTime() + this.expiryHours * 60 * 60 * 1000,
      );
      if (new Date() > expiresAt) {
        throw new Error('Verification link has expired.');
      }
    }

    user.activationKey = null as any;
    if (!user.status) {
      user.status = 1;
    }
    await this.userRepo.save(user);

    const loginUrl = this.urlBuilder.buildLoginUrl();

    await this.eventsService.emitWithLogs('tenant_email_verified', {
      actorId: user.userId,
      recipientIds: [user.userId],
      entity: { entityId: user.userId, entityType: 'user' },
      data: {
        loginUrl,
      },
    });

    return {
      userId: user.userId,
      email: user.email,
      verified: true,
    };
  }

  private generateToken(): string {
    return (
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2)
    );
  }
}

