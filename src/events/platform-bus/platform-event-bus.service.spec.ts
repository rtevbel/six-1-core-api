import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlatformEventBusService } from './platform-event-bus.service';
import { PlatformEventRecordEntity } from './entities/platform_event_record.entity';
import { PLATFORM_EVENT_CONSUMERS } from './interfaces/platform-event-consumer.interface';

describe('PlatformEventBusService', () => {
  let service: PlatformEventBusService;
  const save = jest.fn().mockImplementation((row) => ({
    ...row,
    recordId: 1,
  }));
  const update = jest.fn();
  const consumer = {
    name: 'TestConsumer',
    canHandle: jest.fn().mockReturnValue(true),
    handle: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformEventBusService,
        {
          provide: getRepositoryToken(PlatformEventRecordEntity),
          useValue: {
            create: jest.fn((row) => row),
            save,
            update,
          },
        },
        {
          provide: PLATFORM_EVENT_CONSUMERS,
          useValue: [consumer],
        },
      ],
    }).compile();

    service = module.get(PlatformEventBusService);
  });

  it('persists and dispatches to consumers', async () => {
    const record = await service.publish({
      eventName: 'six1-event.project_created',
      tenantId: 5,
      correlationId: 'corr-1',
      entity: { entityType: 'project', entityId: 9 },
      data: { projectId: 9 },
      occurredAt: new Date('2026-06-15T00:00:00Z'),
    });

    expect(record.recordId).toBe(1);
    expect(consumer.handle).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(1, { status: 'dispatched' });
  });
});
