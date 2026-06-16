import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsService } from './events.service';
import { EventEntity } from './entities/event.entity';
import { EventLogsService } from './event_logs/event_logs.service';
import { PlatformEventFlagsService } from './config/platform-event-flags.service';
import { PlatformEventBusService } from './platform-bus/platform-event-bus.service';

describe('EventsService', () => {
  let service: EventsService;
  let emitter: { emit: jest.Mock; emitAsync: jest.Mock };
  let platformEventBus: { publish: jest.Mock };
  let platformEventFlags: {
    getEnvelopeValidationMode: jest.Mock;
    isEventBusEnabled: jest.Mock;
  };

  beforeEach(async () => {
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
          useValue: {},
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
});
