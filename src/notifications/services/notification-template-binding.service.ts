import { Injectable } from '@nestjs/common';
import { EventsService } from '../../events/events.service';
import { EventListenersService } from '../../events/event_listeners/event_listeners.service';
import { NotificationChannelsService } from '../notification_channels/notification_channels.service';
import { NotificationTemplatesService } from '../notification_templates/notification_templates.service';
import { BindNotificationTemplateDto } from '../dto/bind-notification-template.dto';
import { CreateEventListenerDto } from '../../events/event_listeners/dto/create-event_listener.dto';
import { CreateNotificationTemplateDto } from '../notification_templates/dto/create-notification_template.dto';
import { UpdateEventListenerDto } from '../../events/event_listeners/dto/update-event_listener.dto';
import { UpdateNotificationTemplateDto } from '../notification_templates/dto/update-notification_template.dto';

/**
 * NotificationTemplateBindingService
 *
 * Manages bindings between events, channels, and templates.
 */
@Injectable()
export class NotificationTemplateBindingService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly eventListenersService: EventListenersService,
    private readonly notificationChannelsService: NotificationChannelsService,
    private readonly notificationTemplatesService: NotificationTemplatesService,
  ) {}

  /**
   * Binds a template to an event and channel.
   * @param userId - ID of the user making the request.
   * @param dto - Binding payload.
   * @returns Binding metadata.
   */
  async bindTemplate(
    userId: number,
    dto: BindNotificationTemplateDto,
  ): Promise<{
    eventId: number;
    channelId: number;
    templateId: number;
    listenerId: number;
  }> {
    const event = await this.eventsService.findOneByName(userId, dto.eventName);
    const channel = await this.notificationChannelsService.findOneByName(
      dto.channelName,
    );

    let template =
      await this.notificationTemplatesService.findOneByNameAndChannel(
        dto.templateName,
        channel.channelId,
      );

    if (!template) {
      const createTemplateDto = {
        name: dto.templateName,
        subject: dto.subject ?? null,
        message: dto.message,
        channelId: channel.channelId,
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

    const existingListener =
      await this.eventListenersService.findOneByEventChannelTemplate(
        event.eventId,
        channel.channelId,
        template.templateId,
      );

    if (existingListener) {
      if (dto.isActive !== undefined) {
        await this.eventListenersService.update(
          userId,
          existingListener.listenerId,
          {
            listenerId: existingListener.listenerId,
            eventId: existingListener.eventId,
            channelId: existingListener.channelId,
            templateId: existingListener.templateId,
            isActive: dto.isActive,
            updatedBy: userId,
          } as UpdateEventListenerDto,
        );
      }

      return {
        eventId: event.eventId,
        channelId: channel.channelId,
        templateId: template.templateId,
        listenerId: existingListener.listenerId,
      };
    }

    const createListenerDto = {
      eventId: event.eventId,
      channelId: channel.channelId,
      templateId: template.templateId,
      isActive: dto.isActive ?? true,
      createdBy: userId,
    } as CreateEventListenerDto;

    const listener = await this.eventListenersService.create(
      userId,
      createListenerDto,
    );

    return {
      eventId: event.eventId,
      channelId: channel.channelId,
      templateId: template.templateId,
      listenerId: listener.listenerId,
    };
  }
}
