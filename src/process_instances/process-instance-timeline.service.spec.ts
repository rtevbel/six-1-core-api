import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { ProcessInstanceTimelineService } from './process-instance-timeline.service';
import { ProcessInstanceEntity } from './entities/process_instance.entity';
import { ProcessInstanceStepEntity } from './process_instance_steps/entities/process_instance_step.entity';
import { ProcessActionExecutionLogEntity } from './process_instance_steps/process_instance_step_actions/entities/process_action_execution_log.entity';
import { ProcessStepExecutionLogEntity } from './entities/process_step_execution_log.entity';
import { PlatformEventRecordEntity } from '../events/platform-bus/entities/platform_event_record.entity';

describe('ProcessInstanceTimelineService', () => {
  let service: ProcessInstanceTimelineService;
  const findOne = jest.fn();
  const stepFind = jest.fn();
  const stepExecutionLogFind = jest.fn();
  const actionLogFind = jest.fn();
  const platformQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    stepExecutionLogFind.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessInstanceTimelineService,
        {
          provide: getRepositoryToken(ProcessInstanceEntity),
          useValue: { findOne },
        },
        {
          provide: getRepositoryToken(ProcessInstanceStepEntity),
          useValue: { find: stepFind },
        },
        {
          provide: getRepositoryToken(ProcessStepExecutionLogEntity),
          useValue: { find: stepExecutionLogFind },
        },
        {
          provide: getRepositoryToken(ProcessActionExecutionLogEntity),
          useValue: { find: actionLogFind },
        },
        {
          provide: getRepositoryToken(PlatformEventRecordEntity),
          useValue: {
            createQueryBuilder: jest.fn(() => platformQb),
          },
        },
      ],
    }).compile();

    service = module.get(ProcessInstanceTimelineService);
  });

  it('throws when process instance is missing', async () => {
    findOne.mockResolvedValue(null);

    await expect(
      service.getTimeline(1, { processInstanceId: 999 }),
    ).rejects.toThrow(RpcException);
  });

  it('builds ordered timeline from lifecycle, actions, and platform events', async () => {
    const startedAt = new Date('2026-01-01T10:00:00.000Z');
    const readyAt = new Date('2026-01-01T10:05:00.000Z');
    const completedAt = new Date('2026-01-01T10:10:00.000Z');
    const actionAt = new Date('2026-01-01T10:11:00.000Z');
    const eventAt = new Date('2026-01-01T10:12:00.000Z');

    findOne.mockResolvedValue({
      processInstanceId: 500,
      processTemplateId: 9,
      tenantId: 1,
      status: 'completed',
      correlationId: 'corr-500',
      startedAt,
      completedAt,
      canceledAt: null,
    });

    stepFind.mockResolvedValue([
      {
        stepInstanceId: 20,
        stepOrder: 1,
        name: 'Review',
        status: 'completed',
        readyAt,
        startedAt: readyAt,
        completedAt,
        canceledAt: null,
      },
    ]);

    actionLogFind.mockResolvedValue([
      {
        executionId: 7,
        stepInstanceId: 20,
        instanceStepActionId: 3,
        runOn: 'step_completed',
        actionType: 'emit_event',
        status: 'succeeded',
        result: { eventName: 'six1-event.process_step_completed' },
        errorMessage: null,
        createdAt: actionAt,
      },
    ]);

    platformQb.getMany.mockResolvedValue([
      {
        recordId: 100,
        eventName: 'six1-event.process_completed',
        correlationId: 'corr-500',
        causationId: null,
        status: 'dispatched',
        occurredAt: eventAt,
      },
    ]);

    const result = await service.getTimeline(1, {
      processInstanceId: 500,
      tenantId: 1,
    });

    expect(result.processInstanceId).toBe(500);
    expect(result.correlationId).toBe('corr-500');
    expect(result.entries.map((entry) => entry.kind)).toEqual([
      'process_started',
      'step_ready',
      'step_started',
      'step_completed',
      'process_completed',
      'step_action',
      'platform_event',
    ]);
    expect(result.summary).toEqual({
      processLifecycleCount: 2,
      stepLifecycleCount: 3,
      stepActionCount: 1,
      platformEventCount: 1,
    });
  });

  it('prefers step execution log entries over step timestamp inference', async () => {
    const startedAt = new Date('2026-01-01T10:00:00.000Z');
    const logCompletedAt = new Date('2026-01-01T10:10:00.000Z');

    findOne.mockResolvedValue({
      processInstanceId: 500,
      processTemplateId: 9,
      tenantId: 1,
      status: 'active',
      correlationId: 'corr-500',
      startedAt,
      completedAt: null,
      canceledAt: null,
    });

    stepExecutionLogFind.mockResolvedValue([
      {
        logId: 1,
        stepInstanceId: 20,
        stepOrder: 1,
        stepName: 'Review',
        event: 'step_completed',
        newStatus: 'completed',
        actorTenantUserId: 42,
        cause: 'manual',
        occurredAt: logCompletedAt,
      },
    ]);

    const result = await service.getTimeline(1, { processInstanceId: 500 });

    const stepCompleted = result.entries.find(
      (entry) => entry.kind === 'step_completed',
    );
    expect(stepCompleted).toMatchObject({
      kind: 'step_completed',
      actorTenantUserId: 42,
      cause: 'manual',
      logId: 1,
    });
    expect(result.summary.stepLifecycleCount).toBe(1);
  });
});
