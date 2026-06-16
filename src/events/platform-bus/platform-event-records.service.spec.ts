import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { PlatformEventRecordsService } from './platform-event-records.service';
import { PlatformEventRecordEntity } from './entities/platform_event_record.entity';

describe('PlatformEventRecordsService', () => {
  let service: PlatformEventRecordsService;
  const qb = {
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformEventRecordsService,
        {
          provide: getRepositoryToken(PlatformEventRecordEntity),
          useValue: {
            createQueryBuilder: jest.fn(() => qb),
          },
        },
      ],
    }).compile();

    service = module.get(PlatformEventRecordsService);
    jest.clearAllMocks();
  });

  it('requires a query scope', async () => {
    await expect(service.findAll({})).rejects.toBeInstanceOf(RpcException);
  });

  it('returns paginated records for correlation filter', async () => {
    const occurredAt = new Date('2026-01-01T00:00:00.000Z');
    qb.getManyAndCount.mockResolvedValue([
      [
        {
          recordId: 1,
          eventName: 'six1-event.tenant.created',
          correlationId: 'corr-1',
          status: 'dispatched',
          occurredAt,
          createdAt: occurredAt,
        },
      ],
      1,
    ]);

    const result = await service.findAll({
      correlationId: 'corr-1',
      page: 1,
      limit: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items[0].eventName).toBe('six1-event.tenant.created');
  });
});
