import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  loadNotificationPlatformFlags,
  type NotificationPlatformFlags,
} from './notification-platform.config';

/**
 * Reads notification platform rollout flags from configuration.
 */
@Injectable()
export class NotificationPlatformFlagsService {
  private readonly flags: NotificationPlatformFlags;

  constructor(private readonly configService: ConfigService) {
    this.flags = loadNotificationPlatformFlags(this.configService);
  }

  getAll(): Readonly<NotificationPlatformFlags> {
    return this.flags;
  }

  isNotificationContextEnabled(): boolean {
    return this.flags.notificationContextEnabled;
  }

  isImmediateDispatchEnabled(): boolean {
    return this.flags.immediateDispatchEnabled;
  }

  getMaxSendAttempts(): number {
    return this.flags.maxSendAttempts;
  }

  getRetryBaseSeconds(): number {
    return this.flags.retryBaseSeconds;
  }
}
