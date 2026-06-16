import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlatformEventTimelineService } from './platform-event-timeline.service';
import { PlatformEventRecordsService } from './platform-event-records.service';
import { ActionExecutionLogEntity } from '../platform-actions/entities/action_execution_log.entity';
import { EventLogEntity } from '../event_logs/entities/event_log.entity';
import { NotificationEntity } from '../../notifications/entities/notification.entity';
import { NotificationLogEntity } from '../../notifications/notification_logs/entities/notification_log.entity';

describe('PlatformEventTimelineService', () => {
  let service: PlatformEventTimelineService;
  let recordsService: jest.Mocked<Pick<PlatformEventRecordsService, 'findForTimeline'>>;

  beforeEach(async () => {
    recordsService = {
      findForTimeline: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformEventTimelineService,
        { provide: PlatformEventRecordsService, useValue: recordsService },
        {
          provide: getRepositoryToken(ActionExecutionLogEntity),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(EventLogEntity),
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              addOrderBy: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
        {
          provide: getRepositoryToken(NotificationEntity),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(NotificationLogEntity),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get(PlatformEventTimelineService);
  });

  it('builds ordered timeline from platform events', async () => {
    const occurredAt = new Date('2026-01-02T10:00:00.000Z');
    recordsService.findForTimeline.mockResolvedValue([
      {
        recordId: 10,
        eventName: 'six1-event.tenant.created',
        correlationId: 'corr-1',
        status: 'dispatched',
        occurredAt,
        createdAt: occurredAt,
      } as never,
    ]);

    const result = await service.getTimeline({ correlationId: 'corr-1' });

    expect(result.correlationId).toBe('corr-1');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].kind).toBe('platform_event');
    expect(result.summary.platformEventCount).toBe(1);
  });
});
