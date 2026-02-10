import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { plainToInstance } from 'class-transformer';
import { NotificationsService } from '../notifications.service';
import { EventLogsService } from '../../events/event_logs/event_logs.service';
import { EventListenersService } from '../../events/event_listeners/event_listeners.service';
import { NotificationLogsService } from '../notification_logs/notification_logs.service';
import { NotificationChannelsService } from '../notification_channels/notification_channels.service';
import { UserNotificationPreferenceService } from '../../users/user-notification-preferences/user-notification-preferences.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationTemplateRendererService } from './notification-template-renderer.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationVariableResolverService } from './notification-variable-resolver.service';

/**
 * NotificationJobService
 *
 * Prepares notifications from event logs and sends pending notifications.
 */
@Injectable()
export class NotificationJobService {
  private readonly logger = new Logger(NotificationJobService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly eventLogsService: EventLogsService,
    private readonly eventListenersService: EventListenersService,
    private readonly notificationLogsService: NotificationLogsService,
    private readonly notificationChannelsService: NotificationChannelsService,
    private readonly userNotificationPreferenceService: UserNotificationPreferenceService,
    private readonly templateRenderer: NotificationTemplateRendererService,
    private readonly dispatcher: NotificationDispatcherService,
    private readonly variableResolver: NotificationVariableResolverService,
  ) {}

  /**
   * Scheduled job to prepare and send notifications.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleNotificationJob(): Promise<void> {
    await this.prepareNotificationsFromEventLogs();
    await this.sendPendingNotifications();
  }

  /**
   * Creates pending notifications from unprocessed event logs.
   */
  private async prepareNotificationsFromEventLogs(): Promise<void> {
    const eventLogs = await this.eventLogsService.getAllEventLogs();

    for (const eventLog of eventLogs) {
      try {
        const listeners = await this.eventListenersService.getListenersByEventId(
          eventLog.eventId,
        );

        for (const listener of listeners) {
          const channelType = this.normalizeChannelType(listener.channel?.name);
          if (!channelType) {
            this.logger.warn(
              `Unsupported channel "${listener.channel?.name}" for listener ${listener.listenerId}`,
            );
            continue;
          }

          const isEnabled =
            await this.userNotificationPreferenceService.isChannelEnabled(
              eventLog.userId,
              listener.channelId,
            );
          if (!isEnabled) {
            continue;
          }

          const subjectTemplate = listener.template?.subject ?? null;
          const messageTemplate =
            listener.template?.message ??
            `Event ${eventLog.event?.name ?? eventLog.eventId} occurred.`;

          const variables = await this.variableResolver.resolve(eventLog);
          const renderResult = this.templateRenderer.render(
            eventLog.event?.name ?? '',
            subjectTemplate,
            messageTemplate,
            variables,
          );

          const status =
            renderResult.missingRequired.length > 0 ? 'failed' : 'pending';

          const createNotificationDto = plainToInstance(
            CreateNotificationDto,
            {
              userId: eventLog.userId,
              eventId: eventLog.eventId,
              type: channelType,
              subject: renderResult.subject,
              message: renderResult.message,
              status,
              scheduledAt: null,
            },
          );

          const notification = await this.notificationsService.create(
            eventLog.userId,
            createNotificationDto,
          );

          if (status === 'failed') {
            await this.notificationLogsService.create(eventLog.userId, {
              notificationId: notification.notificationId,
              channelId: listener.channelId,
              status: 'failed',
              response: `Missing required template variables: ${renderResult.missingRequired.join(
                ', ',
              )}`,
            });
          }
        }

        await this.eventLogsService.update(eventLog.userId, eventLog.logId, {
          logId: eventLog.logId,
          status: 1,
        });
      } catch (error) {
        this.logger.error(
          `Failed to prepare notifications for eventLog ${eventLog.logId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  /**
   * Sends pending notifications and writes notification logs.
   */
  private async sendPendingNotifications(): Promise<void> {
    const pendingNotifications =
      await this.notificationsService.getPendingNotifications();

    for (const notification of pendingNotifications) {
      try {
        const channel = await this.notificationChannelsService.findOneByName(
          notification.type,
        );

        const result = await this.dispatcher.send(notification);

        await this.notificationLogsService.create(notification.userId, {
          notificationId: notification.notificationId,
          channelId: channel.channelId,
          status: result.status,
          response: result.response ?? null,
        });

        await this.notificationsService.updateStatus(
          notification.notificationId,
          result.status,
          result.status === 'sent' ? new Date() : null,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send notification ${notification.notificationId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  /**
   * Normalizes a channel name into a supported notification type.
   * @param channelName - Raw channel name.
   * @returns Normalized type or null.
   */
  private normalizeChannelType(
    channelName?: string,
  ): CreateNotificationDto['type'] | null {
    if (!channelName) {
      return null;
    }

    const normalized = channelName.toLowerCase().trim();
    if (normalized === 'email') {
      return 'email';
    }
    if (normalized === 'sms') {
      return 'sms';
    }
    if (normalized === 'push') {
      return 'push';
    }
    if (normalized === 'system') {
      return 'system';
    }

    return null;
  }
}
