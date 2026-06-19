import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { EventsService } from '../../events/events.service';
import { EventListenersService } from '../../events/event_listeners/event_listeners.service';
import { EventNotificationRulesService } from '../../events/event_notification_rules/event_notification_rules.service';
import { PlatformEventFlagsService } from '../../events/config/platform-event-flags.service';
import { NotificationChannelsService } from '../notification_channels/notification_channels.service';
import { NotificationTemplatesService } from '../notification_templates/notification_templates.service';
import { BindNotificationTemplateDto } from '../dto/bind-notification-template.dto';
import { CreateEventListenerDto } from '../../events/event_listeners/dto/create-event_listener.dto';
import { CreateNotificationTemplateDto } from '../notification_templates/dto/create-notification_template.dto';
import { UpdateEventListenerDto } from '../../events/event_listeners/dto/update-event_listener.dto';
import { UpdateNotificationTemplateDto } from '../notification_templates/dto/update-notification_template.dto';
import {
  BIND_NOTIFICATION_TEMPLATE_DEPRECATED_MESSAGE,
  EVENT_LISTENERS_WRITE_BLOCKED_MESSAGE,
} from '../../events/event_listeners/event-listeners-deprecation.constants';

export interface BindNotificationTemplateResult {
  eventId: number;
  channelId: number;
  templateId: number;
  /** @deprecated Use `ruleId`. Present only for legacy listener bindings. */
  listenerId?: number | null;
  ruleId?: number;
}

/**
 * Manages bindings between events, channels, and templates.
 * @deprecated Prefer `event_notification_rules` CRUD directly.
 */
@Injectable()
export class NotificationTemplateBindingService {
  private readonly logger = new Logger(NotificationTemplateBindingService.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly eventListenersService: EventListenersService,
    private readonly notificationRulesService: EventNotificationRulesService,
    private readonly platformFlags: PlatformEventFlagsService,
    private readonly notificationChannelsService: NotificationChannelsService,
    private readonly notificationTemplatesService: NotificationTemplatesService,
  ) {}

  /**
   * Binds a template to an event and channel.
   * When notification rules are enabled, creates/updates an `event_notification_rule`
   * instead of a legacy `event_listener`.
   */
  async bindTemplate(
    userId: number,
    dto: BindNotificationTemplateDto,
  ): Promise<BindNotificationTemplateResult> {
    this.logger.warn(BIND_NOTIFICATION_TEMPLATE_DEPRECATED_MESSAGE);

    const event = await this.eventsService.findOneByName(userId, dto.eventName);
    const channel = await this.notificationChannelsService.findOneByName(
      dto.channelName,
    );

    const template = await this.ensureTemplate(
      userId,
      dto,
      channel.channelId,
    );

    if (this.platformFlags.isNotificationRulesEnabled()) {
      return this.bindViaNotificationRule(
        userId,
        event.eventId,
        event.name,
        channel.channelId,
        template.templateId,
        dto.isActive,
      );
    }

    if (this.platformFlags.isEventListenersWriteDisabled()) {
      throw new RpcException(
        `${EVENT_LISTENERS_WRITE_BLOCKED_MESSAGE} Enable PLATFORM_EVENT_NOTIFICATION_RULES_ENABLED or disable PLATFORM_EVENT_LISTENERS_WRITE_DISABLED.`,
      );
    }

    return this.bindViaLegacyListener(
      userId,
      event.eventId,
      channel.channelId,
      template.templateId,
      dto.isActive,
    );
  }

  private async ensureTemplate(
    userId: number,
    dto: BindNotificationTemplateDto,
    channelId: number,
  ) {
    let template =
      await this.notificationTemplatesService.findOneByNameAndChannel(
        dto.templateName,
        channelId,
      );

    if (!template) {
      const createTemplateDto = {
        name: dto.templateName,
        subject: dto.subject ?? null,
        message: dto.message,
        channelId,
      } as CreateNotificationTemplateDto;

      template = await this.notificationTemplatesService.create(
        userId,
        createTemplateDto,
      );
    } else {
      const updateTemplateDto = {
        templateId: template.templateId,
        subject: dto.subject ?? template.subject,
        message: dto.message ?? template.message,
        channelId: template.channelId,
        name: template.name,
      } as UpdateNotificationTemplateDto;

      await this.notificationTemplatesService.update(
        userId,
        template.templateId,
        updateTemplateDto,
      );
    }

    return template;
  }

  private async bindViaNotificationRule(
    userId: number,
    eventId: number,
    eventName: string,
    channelId: number,
    templateId: number,
    isActive?: boolean,
  ): Promise<BindNotificationTemplateResult> {
    const existing = await this.notificationRulesService.findByEventChannelTemplate(
      eventName,
      channelId,
      templateId,
      0,
    );

    if (existing) {
      if (isActive !== undefined && existing.isActive !== isActive) {
        await this.notificationRulesService.update(userId, existing.ruleId, {
          isActive,
          tenantId: 0,
        });
      }

      return {
        eventId,
        channelId,
        templateId,
        ruleId: existing.ruleId,
        listenerId: null,
      };
    }

    const rule = await this.notificationRulesService.create(userId, {
      tenantId: 0,
      eventName,
      channelId,
      templateId,
      recipientSpec: { type: 'event_actor' },
      isActive: isActive ?? true,
      createdBy: userId,
      updatedBy: userId,
    });

    return {
      eventId,
      channelId,
      templateId,
      ruleId: rule.ruleId,
      listenerId: null,
    };
  }

  private async bindViaLegacyListener(
    userId: number,
    eventId: number,
    channelId: number,
    templateId: number,
    isActive?: boolean,
  ): Promise<BindNotificationTemplateResult> {
    const existingListener =
      await this.eventListenersService.findOneByEventChannelTemplate(
        eventId,
        channelId,
        templateId,
      );

    if (existingListener) {
      if (isActive !== undefined) {
        await this.eventListenersService.update(
          userId,
          existingListener.listenerId,
          {
            listenerId: existingListener.listenerId,
            eventId: existingListener.eventId,
            channelId: existingListener.channelId,
            templateId: existingListener.templateId,
            isActive,
            updatedBy: userId,
          } as UpdateEventListenerDto,
        );
      }

      return {
        eventId,
        channelId,
        templateId,
        listenerId: existingListener.listenerId,
      };
    }

    const createListenerDto = {
      eventId,
      channelId,
      templateId,
      isActive: isActive ?? true,
      createdBy: userId,
    } as CreateEventListenerDto;

    const listener = await this.eventListenersService.create(
      userId,
      createListenerDto,
    );

    return {
      eventId,
      channelId,
      templateId,
      listenerId: listener.listenerId,
    };
  }
}
