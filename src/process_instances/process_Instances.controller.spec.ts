import { Test, TestingModule } from '@nestjs/testing';
import { ProcessInstancesController } from './process_instances.controller';
import { ProcessInstancesService } from './process_instances.service';
import { ProcessRunnerService } from './process-runner.service';
import { ProcessLifecycleFacade } from '../automation/process-lifecycle.facade';
import { StepOrchestratorService } from '../automation/step-orchestrator.service';

describe('ProcessInstancesController', () => {
  let controller: ProcessInstancesController;
  const buildPayload = jest.fn();
  const startProcess = jest.fn();
  const attemptAdvance = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessInstancesController],
      providers: [
        { provide: ProcessInstancesService, useValue: {} },
        { provide: ProcessRunnerService, useValue: { buildPayload } },
        { provide: ProcessLifecycleFacade, useValue: { startProcess } },
        { provide: StepOrchestratorService, useValue: { attemptAdvance } },
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

    expect(result).toEqual({ processInstanceId: 9, firstStepInstanceId: 101 });
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
      expect.objectContaining({ cause: 'manual', actorTenantUserId: 7 }),
    );
  });
});
