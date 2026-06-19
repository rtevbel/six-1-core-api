import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { NotificationTemplateBindingService } from './notification-template-binding.service';
import { EventsService } from '../../events/events.service';
import { EventListenersService } from '../../events/event_listeners/event_listeners.service';
import { EventNotificationRulesService } from '../../events/event_notification_rules/event_notification_rules.service';
import { PlatformEventFlagsService } from '../../events/config/platform-event-flags.service';
import { NotificationChannelsService } from '../notification_channels/notification_channels.service';
import { NotificationTemplatesService } from '../notification_templates/notification_templates.service';

describe('NotificationTemplateBindingService', () => {
  let service: NotificationTemplateBindingService;
  let rulesService: {
    findByEventChannelTemplate: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let listenersService: { create: jest.Mock; findOneByEventChannelTemplate: jest.Mock };
  let platformFlags: {
    isNotificationRulesEnabled: jest.Mock;
    isEventListenersWriteDisabled: jest.Mock;
  };

  const bindDto = {
    eventName: 'six1-event.project_created',
    channelName: 'email',
    templateName: 'welcome',
    message: 'Hello',
  };

  beforeEach(async () => {
    rulesService = {
      findByEventChannelTemplate: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ ruleId: 42 }),
      update: jest.fn(),
    };
    listenersService = {
      create: jest.fn(),
      findOneByEventChannelTemplate: jest.fn(),
    };
    platformFlags = {
      isNotificationRulesEnabled: jest.fn().mockReturnValue(true),
      isEventListenersWriteDisabled: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplateBindingService,
        {
          provide: EventsService,
          useValue: {
            findOneByName: jest.fn().mockResolvedValue({
              eventId: 1,
              name: 'six1-event.project_created',
            }),
          },
        },
        { provide: EventListenersService, useValue: listenersService },
        { provide: EventNotificationRulesService, useValue: rulesService },
        { provide: PlatformEventFlagsService, useValue: platformFlags },
        {
          provide: NotificationChannelsService,
          useValue: {
            findOneByName: jest.fn().mockResolvedValue({ channelId: 2, name: 'email' }),
          },
        },
        {
          provide: NotificationTemplatesService,
          useValue: {
            findOneByNameAndChannel: jest.fn().mockResolvedValue({
              templateId: 3,
              name: 'welcome',
              channelId: 2,
              subject: 'Hi',
              message: 'Hello',
            }),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(NotificationTemplateBindingService);
  });

  it('creates event_notification_rule when rules flag is enabled', async () => {
    const result = await service.bindTemplate(10, bindDto);

    expect(rulesService.create).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        eventName: 'six1-event.project_created',
        channelId: 2,
        templateId: 3,
        recipientSpec: { type: 'event_actor' },
      }),
    );
    expect(result.ruleId).toBe(42);
    expect(result.listenerId).toBeNull();
    expect(listenersService.create).not.toHaveBeenCalled();
  });

  it('blocks legacy listener bind when writes disabled and rules off', async () => {
    platformFlags.isNotificationRulesEnabled.mockReturnValue(false);
    platformFlags.isEventListenersWriteDisabled.mockReturnValue(true);

    await expect(service.bindTemplate(10, bindDto)).rejects.toThrow(RpcException);
    expect(listenersService.create).not.toHaveBeenCalled();
  });
});
