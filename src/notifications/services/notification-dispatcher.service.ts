import { Injectable } from '@nestjs/common';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationSendResult } from '../interfaces/notification-send-result.interface';
import {
  EmailNotificationSender,
  PushNotificationSender,
  SmsNotificationSender,
  SystemNotificationSender,
} from './notification-senders.service';

/**
 * NotificationDispatcherService
 *
 * Routes notifications to a channel-specific sender.
 */
@Injectable()
export class NotificationDispatcherService {
  constructor(
    private readonly emailSender: EmailNotificationSender,
    private readonly smsSender: SmsNotificationSender,
    private readonly pushSender: PushNotificationSender,
    private readonly systemSender: SystemNotificationSender,
  ) {}

  /**
   * Sends a notification using the correct channel handler.
   * @param notification - Notification to send.
   * @returns Result of send attempt.
   */
  async send(notification: NotificationEntity): Promise<NotificationSendResult> {
    switch (notification.type) {
      case 'email':
        return this.emailSender.send(notification);
      case 'sms':
        return this.smsSender.send(notification);
      case 'push':
        return this.pushSender.send(notification);
      case 'system':
        return this.systemSender.send(notification);
      default:
        return {
          status: 'failed',
          response: `Unsupported notification type: ${notification.type}`,
        };
    }
  }
}
