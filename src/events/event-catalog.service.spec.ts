import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventCatalogService } from './event-catalog.service';
import { EventsService } from './events.service';
import { EventEntity } from './entities/event.entity';
import { getPlatformEventCatalogSeedEntry } from './seed/platform-event-catalog.seed';

describe('EventCatalogService', () => {
  let service: EventCatalogService;
  let eventsService: {
    findIdByNameOrNull: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    eventsService = {
      findIdByNameOrNull: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCatalogService,
        { provide: EventsService, useValue: eventsService },
        {
          provide: getRepositoryToken(EventEntity),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(EventCatalogService);
  });

  it('returns cached id on second lookup', async () => {
    eventsService.findIdByNameOrNull.mockResolvedValue(42);

    await expect(service.getIdByName('six1-event.project_created')).resolves.toBe(
      42,
    );
    await expect(service.getIdByName('six1-event.project_created')).resolves.toBe(
      42,
    );
    expect(eventsService.findIdByNameOrNull).toHaveBeenCalledTimes(1);
  });

  it('creates catalog entry with seed metadata when missing', async () => {
    eventsService.findIdByNameOrNull.mockResolvedValue(null);
    eventsService.create.mockResolvedValue({ eventId: 7 });

    const seed = getPlatformEventCatalogSeedEntry('six1-event.process_started');
    expect(seed).toBeDefined();

    await expect(service.getIdByName('six1-event.process_started')).resolves.toBe(
      7,
    );

    expect(eventsService.create).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        name: 'six1-event.process_started',
        category: 'process',
        isSystem: true,
        schemaVersion: '1.0',
        payloadSchema: seed?.payloadSchema,
      }),
    );
  });

  it('creates minimal entry for unknown event names', async () => {
    eventsService.findIdByNameOrNull.mockResolvedValue(null);
    eventsService.create.mockResolvedValue({ eventId: 99 });

    await expect(service.getIdByName('six1-event.custom.unknown')).resolves.toBe(
      99,
    );

    expect(eventsService.create).toHaveBeenCalledWith(1, {
      name: 'six1-event.custom.unknown',
      description: 'six1-event.custom.unknown',
      createdBy: 1,
    });
  });
});
