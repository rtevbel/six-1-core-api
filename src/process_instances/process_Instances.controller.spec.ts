import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstancesController } from './process_instances.controller';
import { ProcessInstancesService } from './process_instances.service';
import { ProcessRunnerService } from './process-runner.service';
import { ProcessStepPermissionService } from './process-step-permission.service';
import { ProcessInstanceTimelineService } from './process-instance-timeline.service';
import { ProcessStepExecutionLogService } from '../automation/process-step-execution-log.service';
import { ProcessLifecycleFacade } from '../automation/process-lifecycle.facade';
import { StepOrchestratorService } from '../automation/step-orchestrator.service';

describe('ProcessInstancesController', () => {
  let controller: ProcessInstancesController;
  const buildPayload = jest.fn();
  const startProcess = jest.fn();
  const batchStartProcess = jest.fn();
  const attemptAdvance = jest.fn();
  const markCompleted = jest.fn();
  const markSkipped = jest.fn();
  const retry = jest.fn();
  const rollback = jest.fn();
  const assertCallerCanCompleteStep = jest.fn();
  const getTimeline = jest.fn();
  const getExecutionLog = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    assertCallerCanCompleteStep.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessInstancesController],
      providers: [
        { provide: ProcessInstancesService, useValue: {} },
        { provide: ProcessRunnerService, useValue: { buildPayload } },
        {
          provide: ProcessLifecycleFacade,
          useValue: { startProcess, batchStartProcess },
        },
        {
          provide: StepOrchestratorService,
          useValue: { attemptAdvance, markCompleted, markSkipped, retry, rollback },
        },
        {
          provide: ProcessStepPermissionService,
          useValue: { assertCallerCanCompleteStep },
        },
        {
          provide: ProcessInstanceTimelineService,
          useValue: { getTimeline },
        },
        {
          provide: ProcessStepExecutionLogService,
          useValue: { getExecutionLog },
        },
      ],
    }).compile();

    controller = module.get<ProcessInstancesController>(
      ProcessInstancesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('startProcess calls facade and advances first step', async () => {
    startProcess.mockResolvedValueOnce({
      processInstanceId: 9,
      firstStepInstanceId: 101,
      correlationId: 'c1',
    });

    const result = await controller.startProcess(7, {
      tenantId: 1,
      createdBy: 7,
      templateId: 2,
      subjectType: 'workflow',
      subjectId: 0,
      context: { invoiceId: 55 },
      correlationId: 'c1',
    });

    expect(result).toEqual({
      processInstanceId: 9,
      firstStepInstanceId: 101,
      correlationId: 'c1',
    });
    expect(startProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 1,
        createdBy: 7,
        templateId: 2,
        subjectType: 'workflow',
        subjectId: 0,
        context: { invoiceId: 55 },
        correlationId: 'c1',
      }),
    );
    expect(attemptAdvance).toHaveBeenCalledWith(
      101,
      expect.objectContaining({
        cause: 'manual',
        correlationId: 'c1',
        actorTenantUserId: 7,
      }),
    );
  });

  it('batchStartProcess delegates to facade', async () => {
    batchStartProcess.mockResolvedValueOnce({
      status: 'started',
      requested: 2,
      deduped: 2,
      results: [
        {
          itemIndex: 0,
          processInstanceId: 9,
          firstStepInstanceId: 101,
          correlationId: 'c1',
        },
      ],
    });

    const result = await controller.batchStartProcess(7, {
      tenantId: 1,
      createdBy: 7,
      templateId: 2,
      async: false,
      items: [
        { subjectType: 'workflow', subjectId: 0, context: { a: 1 } },
        { subjectType: 'workflow', subjectId: 0, context: { b: 2 } },
      ],
    });

    expect(result.status).toBe('started');
    expect(batchStartProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 1,
        createdBy: 7,
        templateId: 2,
        async: false,
        items: expect.any(Array),
      }),
    );
  });

  it('startProcess resolves super-admin tenantId 0 for global/system scope', async () => {
    startProcess.mockResolvedValueOnce({
      processInstanceId: 11,
      firstStepInstanceId: null,
    });

    await controller.startProcess(1, {
      tenantId: 0,
      templateId: 15,
      subjectType: 'workflow',
      subjectId: 0,
    });

    expect(startProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 0,
        createdBy: 1,
        templateId: 15,
        subjectType: 'workflow',
        subjectId: 0,
      }),
    );
  });

  it('completeProcessInstanceStep delegates to orchestrator with strict preconditions', async () => {
    markCompleted.mockResolvedValueOnce(undefined);

    const result = await controller.completeProcessInstanceStep(7, {
      processInstanceId: 9,
      stepInstanceId: 101,
      tenantId: 1,
      correlationId: 'c1',
    });

    expect(result).toEqual({
      processInstanceId: 9,
      stepInstanceId: 101,
      status: 'completed',
    });
    expect(assertCallerCanCompleteStep).toHaveBeenCalledWith(7, 101, undefined);
    expect(markCompleted).toHaveBeenCalledWith(
      101,
      expect.objectContaining({
        cause: 'manual',
        actorTenantUserId: 7,
        correlationId: 'c1',
        failOnPrecondition: true,
        expectedProcessInstanceId: 9,
        expectedTenantId: 1,
      }),
    );
  });

  it('skipProcessInstanceStep delegates to orchestrator with strict preconditions', async () => {
    markSkipped.mockResolvedValueOnce(undefined);

    const result = await controller.skipProcessInstanceStep(7, {
      processInstanceId: 9,
      stepInstanceId: 101,
      tenantId: 1,
      correlationId: 'c1',
      tenantUserId: 42,
    });

    expect(result).toEqual({
      processInstanceId: 9,
      stepInstanceId: 101,
      status: 'skipped',
    });
    expect(assertCallerCanCompleteStep).toHaveBeenCalledWith(7, 101, 42);
    expect(markSkipped).toHaveBeenCalledWith(
      101,
      expect.objectContaining({
        cause: 'manual',
        actorTenantUserId: 7,
        correlationId: 'c1',
        failOnPrecondition: true,
        expectedProcessInstanceId: 9,
        expectedTenantId: 1,
      }),
    );
  });

  it('retryProcessInstanceStep delegates to orchestrator with strict preconditions', async () => {
    retry.mockResolvedValueOnce(undefined);

    const result = await controller.retryProcessInstanceStep(7, {
      processInstanceId: 9,
      stepInstanceId: 101,
      tenantId: 1,
      correlationId: 'c1',
      tenantUserId: 42,
    });

    expect(result).toEqual({
      processInstanceId: 9,
      stepInstanceId: 101,
      status: 'ready',
    });
    expect(assertCallerCanCompleteStep).toHaveBeenCalledWith(7, 101, 42);
    expect(retry).toHaveBeenCalledWith(
      101,
      expect.objectContaining({
        cause: 'manual',
        actorTenantUserId: 7,
        correlationId: 'c1',
        failOnPrecondition: true,
        expectedProcessInstanceId: 9,
        expectedTenantId: 1,
      }),
    );
  });

  it('rollbackProcessInstanceStep delegates to orchestrator with strict preconditions', async () => {
    rollback.mockResolvedValueOnce(undefined);

    const result = await controller.rollbackProcessInstanceStep(7, {
      processInstanceId: 9,
      stepInstanceId: 101,
      tenantId: 1,
      correlationId: 'c1',
      tenantUserId: 42,
    });

    expect(result).toEqual({
      processInstanceId: 9,
      stepInstanceId: 101,
      status: 'pending',
    });
    expect(assertCallerCanCompleteStep).toHaveBeenCalledWith(7, 101, 42);
    expect(rollback).toHaveBeenCalledWith(
      101,
      expect.objectContaining({
        cause: 'manual',
        actorTenantUserId: 7,
        correlationId: 'c1',
        failOnPrecondition: true,
        expectedProcessInstanceId: 9,
        expectedTenantId: 1,
      }),
    );
  });

  it('getProcessInstanceTimeline delegates to timeline service', async () => {
    const timeline = {
      processInstanceId: 9,
      entries: [],
      summary: {
        processLifecycleCount: 0,
        stepLifecycleCount: 0,
        stepActionCount: 0,
        platformEventCount: 0,
      },
    };
    getTimeline.mockResolvedValueOnce(timeline);

    const result = await controller.getProcessInstanceTimeline(7, {
      processInstanceId: 9,
      tenantId: 1,
    });

    expect(result).toBe(timeline);
    expect(getTimeline).toHaveBeenCalledWith(7, {
      processInstanceId: 9,
      tenantId: 1,
    });
  });

  it('getProcessInstanceStepExecutionLog delegates to execution log service', async () => {
    const logResult = {
      processInstanceId: 9,
      tenantId: 1,
      total: 0,
      entries: [],
    };
    getExecutionLog.mockResolvedValueOnce(logResult);

    const result = await controller.getProcessInstanceStepExecutionLog(7, {
      processInstanceId: 9,
      tenantId: 1,
    });

    expect(result).toBe(logResult);
    expect(getExecutionLog).toHaveBeenCalledWith(7, {
      processInstanceId: 9,
      tenantId: 1,
    });
  });
});
