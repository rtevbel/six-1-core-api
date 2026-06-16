import { Test, TestingModule } from '@nestjs/testing';
import { SystemEntityEventEmitterService } from './system-entity-event-emitter.service';
import { EventsService } from './events.service';
import { PLATFORM_EVENT_NAMES } from './constants/platform-event-names.constants';

describe('SystemEntityEventEmitterService', () => {
  let service: SystemEntityEventEmitterService;
  let eventsService: { emit: jest.Mock };

  beforeEach(async () => {
    eventsService = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemEntityEventEmitterService,
        { provide: EventsService, useValue: eventsService },
      ],
    }).compile();

    service = module.get(SystemEntityEventEmitterService);
  });

  it('emits canonical system_entity.updated for allowlisted object types', () => {
    service.emitUpdated({
      objectType: 'process_instances',
      entityId: 12,
      tenantId: 3,
      changedFields: ['statusId'],
      actorUserId: 9,
    });

    expect(eventsService.emit).toHaveBeenCalledWith(
      PLATFORM_EVENT_NAMES.SYSTEM_ENTITY_UPDATED,
      expect.objectContaining({
        tenantId: 3,
        data: expect.objectContaining({
          objectType: 'process_instances',
          resolutionMode: 'system_table',
          entityId: 12,
          coreId: 12,
          changedFields: ['statusId'],
          updatedBy: 9,
        }),
      }),
    );
  });

  it('skips non-system_table object types', () => {
    service.emitUpdated({
      objectType: 'customer',
      entityId: 1,
      changedFields: ['name'],
    });

    expect(eventsService.emit).not.toHaveBeenCalled();
  });
});
