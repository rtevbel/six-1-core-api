import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RpcException } from '@nestjs/microservices';
import { EventsService } from './events.service';
import { EVENTS_LIST_LIMIT_MAX } from './constants';
import { EventEntity } from './entities/event.entity';
import { EventLogsService } from './event_logs/event_logs.service';
import { PlatformEventFlagsService } from './config/platform-event-flags.service';
import { PlatformEventBusService } from './platform-bus/platform-event-bus.service';

describe('EventsService', () => {
  let service: EventsService;
  let eventRepository: { findAndCount: jest.Mock };
  let emitter: { emit: jest.Mock; emitAsync: jest.Mock };
  let platformEventBus: { publish: jest.Mock };
  let platformEventFlags: {
    getEnvelopeValidationMode: jest.Mock;
    isEventBusEnabled: jest.Mock;
  };

  beforeEach(async () => {
    eventRepository = {
      findAndCount: jest.fn(),
    };
    emitter = {
      emit: jest.fn(),
      emitAsync: jest.fn().mockResolvedValue([]),
    };
    platformEventBus = {
      publish: jest.fn().mockResolvedValue({ recordId: 1 }),
    };
    platformEventFlags = {
      getEnvelopeValidationMode: jest.fn().mockReturnValue('off'),
      isEventBusEnabled: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(EventEntity),
          useValue: eventRepository,
        },
        { provide: EventEmitter2, useValue: emitter },
        {
          provide: EventLogsService,
          useValue: { createEventLogByEventName: jest.fn() },
        },
        {
          provide: PlatformEventFlagsService,
          useValue: platformEventFlags,
        },
        {
          provide: PlatformEventBusService,
          useValue: platformEventBus,
        },
      ],
    }).compile();

    service = module.get(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('emits envelopes with normalized entity refs and inferred refs', () => {
    service.emit('six1-event.process_step_ready', {
      entity: {
        entityType: 'ProcessStep',
        entityId: 9,
        objectType: 'project',
        resolutionMode: 'sor_bound',
        coreId: 3,
      },
      data: {
        processInstanceId: 42,
        stepInstanceId: 9,
      },
    });

    expect(emitter.emit).toHaveBeenCalledWith(
      'six1-event.process_step_ready',
      expect.objectContaining({
        entity: expect.objectContaining({
          objectType: 'project',
          resolutionMode: 'sor_bound',
          coreId: 3,
        }),
        refs: {
          processInstanceId: 42,
          stepInstanceId: 9,
        },
      }),
    );
  });

  it('routes through PlatformEventBus when enabled', async () => {
    platformEventFlags.isEventBusEnabled.mockReturnValue(true);

    await service.emitAsync('six1-event.process_step_ready', {
      tenantId: 1,
      correlationId: 'corr-bus',
      entity: { entityType: 'ProcessStep', entityId: 9 },
      data: { processInstanceId: 42, stepInstanceId: 9 },
    });

    expect(platformEventBus.publish).toHaveBeenCalled();
    expect(emitter.emitAsync).not.toHaveBeenCalled();
  });

  describe('findAll', () => {
    it('accepts limit=500 as-is', async () => {
      eventRepository.findAndCount.mockResolvedValue([[{ eventId: 1 }], 600]);

      const result = await service.findAll(1, {
        page: 1,
        limit: EVENTS_LIST_LIMIT_MAX,
        sortBy: 'name',
        sortOrder: 'ASC',
      } as any);

      expect(eventRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { name: 'ASC' },
          take: EVENTS_LIST_LIMIT_MAX,
          skip: 0,
        }),
      );
      expect(result.limit).toBe(EVENTS_LIST_LIMIT_MAX);
      expect(result.pagination.limit).toBe(EVENTS_LIST_LIMIT_MAX);
    });

    it('clamps values above 500 back to the max', async () => {
      eventRepository.findAndCount.mockResolvedValue([[{ eventId: 1 }], 900]);

      const result = await service.findAll(1, {
        page: 2,
        limit: EVENTS_LIST_LIMIT_MAX + 250,
        sortBy: 'name',
        sortOrder: 'ASC',
      } as any);

      expect(eventRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: EVENTS_LIST_LIMIT_MAX,
          skip: EVENTS_LIST_LIMIT_MAX,
        }),
      );
      expect(result.limit).toBe(EVENTS_LIST_LIMIT_MAX);
    });

    it('throws when no records match the filters', async () => {
      eventRepository.findAndCount.mockResolvedValue([[], 0]);

      await expect(
        service.findAll(1, {
          page: 1,
          limit: 10,
        } as any),
      ).rejects.toBeInstanceOf(RpcException);
    });
  });
});
