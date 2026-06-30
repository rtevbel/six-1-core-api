import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { applyJsonLogicRule } from '../../common/json-logic/json-logic-rule.util';
import { NotificationsService } from '../notifications.service';
import { EventLogsService } from '../../events/event_logs/event_logs.service';
import { EventListenersService } from '../../events/event_listeners/event_listeners.service';
import { EventNotificationRulesService } from '../../events/event_notification_rules/event_notification_rules.service';
import type { EventNotificationRuleEntity } from '../../events/event_notification_rules/entities/event_notification_rule.entity';
import type { EventEnvelope } from '../../events/types';
import { NotificationLogsService } from '../notification_logs/notification_logs.service';
import { NotificationChannelsService } from '../notification_channels/notification_channels.service';
import { UserNotificationPreferenceService } from '../../users/user-notification-preferences/user-notification-preferences.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationTemplateEngineService } from '../template-engine/notification-template-engine.service';
import { NotificationPlatformFlagsService } from '../config/notification-platform-flags.service';
import { PlatformEventFlagsService } from '../../events/config/platform-event-flags.service';
import { NotificationTemplatesService } from '../notification_templates/notification_templates.service';
import { buildEventEnvelopeFromEventLog } from './notification-event-log-envelope.util';
import { parseOptionalPositiveInt } from '../context/notification-context-source.util';
import {
  readDestinationEmailFromPayload,
  readRuleDispatchFromPayload,
} from '../../events/notification-rules/event-log-platform-payload.util';
import type { EventLogEntity } from '../../events/event_logs/entities/event_log.entity';
import type { NotificationEntity } from '../entities/notification.entity';
import { computeNotificationNextRetryAt } from './notification-dispatch-retry.util';

type ListenerShape = {
  listenerId: number;
  channelId: number;
  channel?: { name?: string };
  template?: { subject?: string | null; message?: string };
};

/**
 * Prepares notifications from event logs and dispatches outbound sends (P8).
 */
@Injectable()
export class NotificationDispatchPipelineService {
  private readonly logger = new Logger(NotificationDispatchPipelineService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly eventLogsService: EventLogsService,
    private readonly eventListenersService: EventListenersService,
    private readonly eventNotificationRulesService: EventNotificationRulesService,
    private readonly notificationLogsService: NotificationLogsService,
    private readonly notificationChannelsService: NotificationChannelsService,
    private readonly userNotificationPreferenceService: UserNotificationPreferenceService,
    private readonly templateEngine: NotificationTemplateEngineService,
    private readonly platformFlags: NotificationPlatformFlagsService,
    private readonly platformEventFlags: PlatformEventFlagsService,
    private readonly notificationTemplatesService: NotificationTemplatesService,
    private readonly dispatcher: NotificationDispatcherService,
  ) {}

  /**
   * Fire-and-forget: prepare notifications from an event log and queue sends.
   */
  enqueueEventLogDispatch(eventLogId: number): void {
    void this.processEventLog(eventLogId).catch((error) => {
      this.logger.error(
        `Immediate dispatch failed for eventLog ${eventLogId}`,
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  /**
   * Fire-and-forget: attempt outbound send for a pending notification.
   */
  enqueueNotificationSend(notificationId: number): void {
    void this.sendNotificationById(notificationId).catch((error) => {
      this.logger.error(
        `Immediate send failed for notification ${notificationId}`,
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  /**
   * Creates notifications from an unprocessed event log and marks it processed.
   */
  async processEventLog(eventLogId: number): Promise<NotificationEntity[]> {
    const eventLog = await this.eventLogsService.findByIdForDispatch(eventLogId);
    if (!eventLog || (eventLog.status ?? 0) !== 0) {
      return [];
    }

    const created: NotificationEntity[] = [];

    try {
      const listeners = await this.resolveListenersForEventLog(eventLog);

      for (const listener of listeners) {
        const notification = await this.prepareNotificationForListener(
          eventLog,
          listener,
        );
        if (notification) {
          created.push(notification);
          if (this.platformFlags.isImmediateDispatchEnabled()) {
            this.enqueueNotificationSend(notification.notificationId);
          }
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
      throw error;
    }

    return created;
  }

  /**
   * Sends all pending notifications ready for dispatch (cron sweeper).
   */
  async dispatchPendingNotifications(limit = 50): Promise<void> {
    const pending =
      await this.notificationsService.getPendingNotifications(limit);

    for (const notification of pending) {
      try {
        await this.sendNotification(notification);
      } catch (error) {
        this.logger.error(
          `Failed to send notification ${notification.notificationId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private async sendNotificationById(notificationId: number): Promise<void> {
    const notification =
      await this.notificationsService.findById(notificationId);
    if (!notification || notification.status !== 'pending') {
      return;
    }
    await this.sendNotification(notification);
  }

  private async sendNotification(
    notification: NotificationEntity,
  ): Promise<void> {
    const channel = await this.notificationChannelsService.findOneByName(
      notification.type,
    );

    const result = await this.dispatcher.send(notification);

    if (result.status === 'sent') {
      await this.notificationLogsService.create(notification.userId, {
        notificationId: notification.notificationId,
        channelId: channel.channelId,
        status: 'sent',
        response: result.response ?? null,
      });
      await this.notificationsService.updateStatus(
        notification.notificationId,
        'sent',
        new Date(),
      );
      await this.notificationsService.clearRetrySchedule(
        notification.notificationId,
      );
      return;
    }

    await this.handleFailedSend(
      notification,
      channel.channelId,
      result.response ?? 'Send failed',
    );
  }

  private async handleFailedSend(
    notification: NotificationEntity,
    channelId: number,
    response: string,
  ): Promise<void> {
    const nextAttempt = (notification.sendAttempts ?? 0) + 1;
    const maxAttempts = this.platformFlags.getMaxSendAttempts();

    await this.notificationLogsService.create(notification.userId, {
      notificationId: notification.notificationId,
      channelId,
      status: 'failed',
      response,
    });

    if (nextAttempt >= maxAttempts) {
      await this.notificationLogsService.create(notification.userId, {
        notificationId: notification.notificationId,
        channelId,
        status: 'dead_letter',
        response: `Max send attempts (${maxAttempts}) exceeded: ${response}`,
      });
      await this.notificationsService.updateStatus(
        notification.notificationId,
        'failed',
        null,
      );
      await this.notificationsService.clearRetrySchedule(
        notification.notificationId,
      );
      return;
    }

    const nextRetryAt = computeNotificationNextRetryAt(
      nextAttempt,
      this.platformFlags.getRetryBaseSeconds(),
    );

    await this.notificationsService.recordFailedSendAttempt(
      notification.notificationId,
      nextRetryAt,
    );
  }

  private async prepareNotificationForListener(
    eventLog: EventLogEntity,
    listener: ListenerShape,
  ): Promise<NotificationEntity | null> {
    const channelType = this.normalizeChannelType(listener.channel?.name);
    if (!channelType) {
      this.logger.warn(
        `Unsupported channel "${listener.channel?.name}" for listener ${listener.listenerId}`,
      );
      return null;
    }

    const isEnabled =
      await this.userNotificationPreferenceService.isChannelEnabled(
        eventLog.userId,
        listener.channelId,
      );
    const destinationEmail = readDestinationEmailFromPayload(eventLog.payload);
    if (!destinationEmail && !isEnabled) {
      return null;
    }

    const subjectTemplate = listener.template?.subject ?? null;
    const messageTemplate =
      listener.template?.message ??
      `Event ${eventLog.event?.name ?? eventLog.eventId} occurred.`;

    const renderResult = await this.templateEngine.renderFromEventLog(
      eventLog,
      subjectTemplate,
      messageTemplate,
    );

    const status =
      renderResult.missingRequired.length > 0 ? 'failed' : 'pending';

    const notification = await this.notificationsService.create(
      eventLog.userId,
      plainToInstance(CreateNotificationDto, {
        userId: eventLog.userId,
        destinationEmail,
        eventId: eventLog.eventId,
        type: channelType,
        subject: renderResult.subject,
        message: renderResult.message,
        status,
        scheduledAt: null,
      }),
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

    return notification;
  }

  private async resolveListenersForEventLog(
    eventLog: EventLogEntity,
  ): Promise<ListenerShape[]> {
    const ruleDispatch = readRuleDispatchFromPayload(eventLog.payload);
    if (ruleDispatch && this.platformEventFlags.isNotificationRulesEnabled()) {
      return this.buildListenersFromRuleDispatch(ruleDispatch);
    }

    if (this.platformEventFlags.isNotificationRulesEnabled()) {
      const eventName = eventLog.event?.name?.trim();
      if (eventName) {
        const payload =
          eventLog.payload && typeof eventLog.payload === 'object'
            ? (eventLog.payload as Record<string, unknown>)
            : {};
        const tenantId =
          parseOptionalPositiveInt(payload.tenantId) ??
          parseOptionalPositiveInt(payload.tenant_id);
        const rules =
          await this.eventNotificationRulesService.findActiveRulesForEvent(
            eventName,
            tenantId ?? 0,
          );

        if (rules.length > 0) {
          const envelope = buildEventEnvelopeFromEventLog(eventLog);
          return rules
            .filter((rule) => this.matchesRuleFilter(rule, envelope))
            .map((rule) => this.ruleToListener(rule));
        }
      }
    }

    return this.eventListenersService.getListenersByEventId(eventLog.eventId);
  }

  private matchesRuleFilter(
    rule: EventNotificationRuleEntity,
    envelope: EventEnvelope,
  ): boolean {
    if (!rule.filterJson || Object.keys(rule.filterJson).length === 0) {
      return true;
    }

    try {
      return applyJsonLogicRule(rule.filterJson, envelope);
    } catch (error) {
      this.logger.warn(
        `Invalid filter_json on rule ${rule.ruleId}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  private ruleToListener(rule: EventNotificationRuleEntity): ListenerShape {
    return {
      listenerId: rule.ruleId,
      channelId: rule.channelId,
      channel: { name: rule.channel?.name },
      template: {
        subject: rule.template?.subject ?? null,
        message: rule.template?.message ?? '',
      },
    };
  }

  private async buildListenersFromRuleDispatch(
    dispatch: NonNullable<ReturnType<typeof readRuleDispatchFromPayload>>,
  ): Promise<ListenerShape[]> {
    const channel = await this.notificationChannelsService.findOne(
      1,
      dispatch.channelId,
    );
    const template = await this.notificationTemplatesService.findOne(
      1,
      dispatch.templateId,
    );

    return [
      {
        listenerId: dispatch.ruleId,
        channelId: dispatch.channelId,
        channel: { name: channel.name },
        template: {
          subject: template.subject,
          message: template.message,
        },
      },
    ];
  }

  private normalizeChannelType(
    channelName?: string,
  ): CreateNotificationDto['type'] | null {
    if (!channelName) {
      return null;
    }

    const normalized = channelName.toLowerCase().trim();
    if (
      normalized === 'email' ||
      normalized === 'sms' ||
      normalized === 'push' ||
      normalized === 'system'
    ) {
      return normalized;
    }

    return null;
  }
}
