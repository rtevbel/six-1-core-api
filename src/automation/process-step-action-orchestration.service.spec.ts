import { Test, TestingModule } from '@nestjs/testing';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import { ProcessStepActionOrchestrationService } from './process-step-action-orchestration.service';
import { ProcessStepActionExecutorService } from './process-step-action-executor.service';
import { PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED } from './process-step-action.constants';

describe('ProcessStepActionOrchestrationService', () => {
  let service: ProcessStepActionOrchestrationService;
  let executor: { executeForStep: jest.Mock; executeForProcessCompleted: jest.Mock };
  let flags: { isStepActionsEnabled: jest.Mock };

  beforeEach(async () => {
    executor = {
      executeForStep: jest.fn().mockResolvedValue({ executed: [], skipped: true }),
      executeForProcessCompleted: jest
        .fn()
        .mockResolvedValue({ executed: [], skipped: true }),
    };
    flags = { isStepActionsEnabled: jest.fn().mockReturnValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessStepActionOrchestrationService,
        { provide: ProcessFeatureFlagsService, useValue: flags },
        { provide: ProcessStepActionExecutorService, useValue: executor },
      ],
    }).compile();

    service = module.get(ProcessStepActionOrchestrationService);
  });

  it('no-ops when feature flag is disabled', async () => {
    flags.isStepActionsEnabled.mockReturnValue(false);

    await service.runStepCompleted(10);

    expect(executor.executeForStep).not.toHaveBeenCalled();
  });

  it('delegates step_completed to the executor', async () => {
    await service.runStepCompleted(10, {
      correlationId: 'corr-1',
      actorUserId: 3,
    });

    expect(executor.executeForStep).toHaveBeenCalledWith(
      10,
      PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
      { correlationId: 'corr-1', actorUserId: 3 },
    );
  });
});
