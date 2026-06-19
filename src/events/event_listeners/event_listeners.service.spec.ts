import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { EventListenersService } from './event_listeners.service';
import { EventListenerEntity } from './entities/event_listener.entity';
import { EventEntity } from '../entities/event.entity';
import { PlatformEventFlagsService } from '../config/platform-event-flags.service';
import { EventNotificationRulesService } from '../event_notification_rules/event_notification_rules.service';
import {
  EVENT_LISTENERS_DEPRECATED_MESSAGE,
  EVENT_LISTENERS_WRITE_BLOCKED_MESSAGE,
} from './event-listeners-deprecation.constants';

describe('EventListenersService', () => {
  let service: EventListenersService;
  let listenerRepo: {
    save: jest.Mock;
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let eventRepo: { findOne: jest.Mock };
  let platformFlags: { isEventListenersWriteDisabled: jest.Mock };
  let rulesService: { findAllForEventName: jest.Mock };

  beforeEach(async () => {
    listenerRepo = {
      save: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    eventRepo = { findOne: jest.fn() };
    platformFlags = { isEventListenersWriteDisabled: jest.fn().mockReturnValue(false) };
    rulesService = { findAllForEventName: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventListenersService,
        {
          provide: getRepositoryToken(EventListenerEntity),
          useValue: listenerRepo,
        },
        {
          provide: getRepositoryToken(EventEntity),
          useValue: eventRepo,
        },
        {
          provide: PlatformEventFlagsService,
          useValue: platformFlags,
        },
        {
          provide: EventNotificationRulesService,
          useValue: rulesService,
        },
      ],
    }).compile();

    service = module.get(EventListenersService);
  });

  it('creates a listener when writes are allowed', async () => {
    const created = { listenerId: 1 } as EventListenerEntity;
    listenerRepo.save.mockResolvedValue(created);

    await expect(
      service.create(1, {
        eventId: 2,
        channelId: 3,
        templateId: 4,
        createdBy: 1,
      }),
    ).resolves.toBe(created);
  });

  it('blocks create when PLATFORM_EVENT_LISTENERS_WRITE_DISABLED', async () => {
    platformFlags.isEventListenersWriteDisabled.mockReturnValue(true);

    await expect(
      service.create(1, {
        eventId: 2,
        channelId: 3,
        templateId: 4,
        createdBy: 1,
      }),
    ).rejects.toThrow(RpcException);

    await expect(
      service.create(1, {
        eventId: 2,
        channelId: 3,
        templateId: 4,
        createdBy: 1,
      }),
    ).rejects.toThrow(EVENT_LISTENERS_WRITE_BLOCKED_MESSAGE);
  });

  it('returns notificationRuleRecords shim when listeners are empty', async () => {
    listenerRepo.findAndCount.mockResolvedValue([[], 0]);
    eventRepo.findOne.mockResolvedValue({ eventId: 5, name: 'six1-event.project_created' });
    rulesService.findAllForEventName.mockResolvedValue([
      { ruleId: 99, eventName: 'six1-event.project_created' },
    ]);

    const result = await service.findAll(1, { eventId: 5, page: 1, limit: 10 });

    expect(result.deprecated).toBe(true);
    expect(result.deprecationMessage).toBe(EVENT_LISTENERS_DEPRECATED_MESSAGE);
    expect(result.notificationRuleRecords).toHaveLength(1);
    expect(result.items).toHaveLength(0);
  });
});
