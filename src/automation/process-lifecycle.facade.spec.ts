import { DataSource, EntityManager } from 'typeorm';
import { ProcessLifecycleFacade } from './process-lifecycle.facade';
import { ProcessInstantiationService } from './process-instantiation.service';
import { ProcessHostRegistry } from './process-host/process-host.registry';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import { ProcessCompletionService } from './process-completion.service';
import { EventsService } from '../events/events.service';
import {
  PROCESS_SUBJECT_TYPE_PROJECT,
  PROCESS_SUBJECT_TYPE_WORKFLOW,
} from './process-subject.constants';
import { RpcException } from '@nestjs/microservices';
import type { ProcessHostAdapter } from './process-host/process-host.adapter';
import type { SchedulerPort } from './scheduler.port';

describe('ProcessLifecycleFacade', () => {
  const mockEm = {
    query: jest.fn(),
  } as unknown as EntityManager;

  const projectAdapter: ProcessHostAdapter = {
    subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
    onProcessStarted: jest.fn(),
    onStepStateChanged: jest.fn(),
    onProcessCompleted: jest.fn(),
    onProcessFailed: jest.fn(),
    canCompleteJob: jest.fn().mockResolvedValue(true),
  };

  const registry = {
    has: jest.fn().mockReturnValue(true),
    get: jest.fn().mockReturnValue(projectAdapter),
  } as unknown as ProcessHostRegistry;

  const instantiation = {
    instantiateProcessIn: jest.fn().mockResolvedValue(99),
  } as unknown as ProcessInstantiationService;

  const events = { emit: jest.fn() } as unknown as EventsService;

  const processFlags = {
    isSubjectModelEnabled: jest.fn().mockReturnValue(false),
    isTier2InstanceSubjectEnabled: jest.fn().mockReturnValue(true),
    isTier3WorkflowSubjectEnabled: jest.fn().mockReturnValue(true),
    isTier1ScheduledTaskEnabled: jest.fn().mockReturnValue(true),
  } as unknown as ProcessFeatureFlagsService;

  const processCompletion = {
    canCompleteProcess: jest.fn(),
    evaluate: jest.fn(),
  } as unknown as ProcessCompletionService;

  const ds = {
    transaction: jest.fn(),
  } as unknown as DataSource;

  const scheduler = {
    schedule: jest.fn().mockResolvedValue(undefined),
  } as unknown as SchedulerPort;

  let facade: ProcessLifecycleFacade;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockEm.query as jest.Mock).mockResolvedValue([
      { step_instance_id: 501 },
    ]);
    facade = new ProcessLifecycleFacade(
      ds,
      instantiation,
      registry,
      events,
      processFlags,
      processCompletion,
      scheduler,
    );
  });

  it('startProcessForProject runs in provided entity manager', async () => {
    const result = await facade.startProcessForProject({
      tenantId: 1,
      createdBy: 2,
      templateId: 3,
      projectId: 10,
      statusIdByName: { 'To Do': 1 },
      entityManager: mockEm,
    });

    expect(instantiation.instantiateProcessIn).toHaveBeenCalledWith(
      mockEm,
      3,
      1,
      2,
      expect.objectContaining({
        subject: expect.objectContaining({
          subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
          subjectId: 10,
        }),
      }),
    );
    expect(projectAdapter.onProcessStarted).toHaveBeenCalled();
    expect(result).toEqual({
      processInstanceId: 99,
      firstStepInstanceId: 501,
      correlationId: expect.any(String),
    });
    expect(mockEm.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE process_instances SET correlation_id'),
      expect.arrayContaining([expect.any(String), 99]),
    );
    expect(ds.transaction).not.toHaveBeenCalled();
  });

  it('startWorkflowProcess passes workflow subject to instantiation', async () => {
    const workflowAdapter: ProcessHostAdapter = {
      subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
      onProcessStarted: jest.fn(),
      onStepStateChanged: jest.fn(),
      onProcessCompleted: jest.fn(),
      onProcessFailed: jest.fn(),
      canCompleteJob: jest.fn().mockResolvedValue(true),
    };
    (registry.get as jest.Mock).mockReturnValue(workflowAdapter);

    await facade.startWorkflowProcess({
      tenantId: 1,
      createdBy: 2,
      templateId: 8,
      entityManager: mockEm,
    });

    expect(instantiation.instantiateProcessIn).toHaveBeenCalledWith(
      mockEm,
      8,
      1,
      2,
      expect.objectContaining({
        subject: expect.objectContaining({
          subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
          subjectId: 0,
        }),
      }),
    );
  });

  it('throws RpcException when Tier 3 flag is disabled', async () => {
    (processFlags.isTier3WorkflowSubjectEnabled as jest.Mock).mockReturnValue(
      false,
    );

    await expect(
      facade.startWorkflowProcess({
        tenantId: 1,
        createdBy: 2,
        templateId: 8,
        entityManager: mockEm,
      }),
    ).rejects.toThrow(RpcException);
  });

  it('batchStartProcess de-dupes items and starts within one transaction', async () => {
    (ds.transaction as unknown as jest.Mock).mockImplementation(
      async (_iso: string, fn: (em: EntityManager) => Promise<unknown>) =>
        fn(mockEm),
    );
    (instantiation.instantiateProcessIn as unknown as jest.Mock)
      .mockResolvedValueOnce(101)
      .mockResolvedValueOnce(102);
    (mockEm.query as jest.Mock)
      .mockResolvedValueOnce([{ step_instance_id: 501 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ step_instance_id: 601 }])
      .mockResolvedValueOnce([]);

    const result = await facade.batchStartProcess({
      tenantId: 1,
      createdBy: 2,
      templateId: 3,
      async: false,
      items: [
        {
          itemIndex: 0,
          subjectType: 'project',
          subjectId: 10,
          subjectMetadata: null,
          context: { a: 1 },
          correlationId: null,
        },
        {
          itemIndex: 1,
          subjectType: 'project',
          subjectId: 10,
          subjectMetadata: null,
          context: { a: 1 },
          correlationId: null,
        },
        {
          itemIndex: 2,
          subjectType: 'workflow',
          subjectId: 0,
          subjectMetadata: null,
          context: { b: 2 },
          correlationId: null,
        },
      ],
    });

    expect(result.status).toBe('started');
    if (result.status === 'started') {
      expect(result.requested).toBe(3);
      expect(result.deduped).toBe(2);
      expect(result.results).toHaveLength(2);
    }
    expect(ds.transaction).toHaveBeenCalledTimes(1);
  });

  it('batchStartProcess queues when async=true', async () => {
    const result = await facade.batchStartProcess({
      tenantId: 1,
      createdBy: 2,
      templateId: 3,
      async: true,
      items: [
        {
          itemIndex: 0,
          subjectType: 'project',
          subjectId: 10,
          subjectMetadata: null,
          context: null,
          correlationId: null,
        },
      ],
    });

    expect(result).toEqual({ status: 'queued', requested: 1, deduped: 1 });
    expect(scheduler.schedule).toHaveBeenCalledWith(
      0,
      'batch-start-process',
      expect.objectContaining({
        tenantId: 1,
        createdBy: 2,
        templateId: 3,
        items: expect.any(Array),
      }),
    );
  });
});
