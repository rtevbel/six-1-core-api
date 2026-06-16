import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED } from './process-step-action.constants';
import { ProcessStepActionExecutionLogService } from './process-step-action-execution-log.service';
import { ProcessActionExecutionLogEntity } from '../process_instances/process_instance_steps/process_instance_step_actions/entities/process_action_execution_log.entity';

describe('ProcessStepActionExecutionLogService', () => {
  let service: ProcessStepActionExecutionLogService;
  let repo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  const claimParams = {
    instanceStepActionId: 301,
    stepInstanceId: 200,
    processInstanceId: 100,
    runOn: PROCESS_STEP_ACTION_RUN_ON_STEP_COMPLETED,
    actionType: 'emit_event' as const,
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((row) =>
        Promise.resolve({ executionId: 1, ...row }),
      ),
      create: jest.fn().mockImplementation((row) => row),
      update: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessStepActionExecutionLogService,
        {
          provide: getRepositoryToken(ProcessActionExecutionLogEntity),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get(ProcessStepActionExecutionLogService);
  });

  it('claims a pending execution row', async () => {
    const claimed = await service.claim(claimParams);

    expect(claimed).toMatchObject({
      executionId: 1,
      instanceStepActionId: 301,
      status: 'pending',
    });
    expect(repo.save).toHaveBeenCalled();
  });

  it('returns null when execution already exists', async () => {
    repo.findOne.mockResolvedValue({ executionId: 9 });

    const claimed = await service.claim(claimParams);

    expect(claimed).toBeNull();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('returns null on duplicate-key race', async () => {
    repo.save.mockRejectedValue(
      new QueryFailedError('INSERT', [], { code: 'ER_DUP_ENTRY' } as never),
    );

    const claimed = await service.claim(claimParams);

    expect(claimed).toBeNull();
  });

  it('marks succeeded and failed outcomes', async () => {
    await service.markSucceeded(1, { eventName: 'six1-event.ok' });
    await service.markFailed(2, 'boom');

    expect(repo.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'succeeded', result: { eventName: 'six1-event.ok' } }),
    );
    expect(repo.update).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ status: 'failed', errorMessage: 'boom' }),
    );
  });
});
