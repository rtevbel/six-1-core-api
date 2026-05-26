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
    });
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
});
