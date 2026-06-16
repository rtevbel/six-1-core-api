import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { ProcessStepExecutionLogService } from './process-step-execution-log.service';
import { ProcessStepExecutionLogEntity } from '../process_instances/entities/process_step_execution_log.entity';
import { ProcessInstanceEntity } from '../process_instances/entities/process_instance.entity';

describe('ProcessStepExecutionLogService', () => {
  let service: ProcessStepExecutionLogService;
  const insert = jest.fn();
  const findOne = jest.fn();
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessStepExecutionLogService,
        {
          provide: getRepositoryToken(ProcessStepExecutionLogEntity),
          useValue: {
            createQueryBuilder: jest.fn(() => qb),
          },
        },
        {
          provide: getRepositoryToken(ProcessInstanceEntity),
          useValue: { findOne },
        },
      ],
    }).compile();

    service = module.get(ProcessStepExecutionLogService);
  });

  it('throws when process instance is missing for read API', async () => {
    findOne.mockResolvedValue(null);

    await expect(
      service.getExecutionLog(1, { processInstanceId: 999 }),
    ).rejects.toThrow(RpcException);
  });

  it('returns paginated execution log entries', async () => {
    const occurredAt = new Date('2026-01-02T10:00:00.000Z');
    findOne.mockResolvedValue({
      processInstanceId: 500,
      tenantId: 1,
    });
    qb.getManyAndCount.mockResolvedValue([
      [
        {
          logId: 9,
          processInstanceId: 500,
          stepInstanceId: 20,
          tenantId: 1,
          stepOrder: 1,
          stepName: 'Review',
          event: 'step_completed',
          previousStatus: 'in_progress',
          newStatus: 'completed',
          cause: 'manual',
          actorTenantUserId: 7,
          correlationId: 'corr-1',
          metadata: null,
          occurredAt,
        },
      ],
      1,
    ]);

    const result = await service.getExecutionLog(1, {
      processInstanceId: 500,
      tenantId: 1,
    });

    expect(result.total).toBe(1);
    expect(result.entries[0]).toMatchObject({
      logId: 9,
      event: 'step_completed',
      actorTenantUserId: 7,
      occurredAt: occurredAt.toISOString(),
    });
  });

  it('records a transition inside a query runner transaction', async () => {
    const occurredAt = new Date('2026-01-02T11:00:00.000Z');
    const manager = { insert: insert.mockResolvedValue(undefined) };

    await service.recordTransition(
      { manager } as never,
      {
        processInstanceId: 500,
        stepInstanceId: 20,
        tenantId: 1,
        stepOrder: 1,
        stepName: 'Review',
        previousStatus: 'ready',
        newStatus: 'in_progress',
        cause: 'manual',
        actorTenantUserId: 7,
        correlationId: 'corr-1',
        occurredAt,
      },
    );

    expect(insert).toHaveBeenCalledWith(
      ProcessStepExecutionLogEntity,
      expect.objectContaining({
        event: 'step_started',
        newStatus: 'in_progress',
        actorTenantUserId: 7,
      }),
    );
  });
});
