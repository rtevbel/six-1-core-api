import { readFileSync } from 'fs';
import { join } from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { StepOrchestratorService } from './step-orchestrator.service';
import { TriggerEngineService } from './trigger-engine.service';
import { EventsService } from '../events/events.service';
import { ProcessHostRegistry } from './process-host/process-host.registry';
import { ConfigObjectStepExecutor } from './config-object-step-executor.service';
import { ChildProcessOrchestrationService } from './child-process-orchestration.service';
import { ProcessCompletionService } from './process-completion.service';
import { PROCESS_SUBJECT_TYPE_PROJECT } from './process-subject.constants';

describe('StepOrchestratorService', () => {
  const source = readFileSync(
    join(__dirname, 'step-orchestrator.service.ts'),
    'utf8',
  );

  it('does not query tasks table directly', () => {
    expect(source).not.toMatch(/FROM\s+tasks/i);
    expect(source).not.toMatch(/UPDATE\s+tasks/i);
    expect(source).not.toMatch(/INSERT\s+INTO\s+tasks/i);
  });

  describe('host delegation', () => {
    let orchestrator: StepOrchestratorService;
    let testingModule: TestingModule;
    const onStepStateChanged = jest.fn().mockResolvedValue(undefined);
    const canCompleteJob = jest.fn().mockResolvedValue(false);
    const onProcessCompleted = jest.fn().mockResolvedValue(undefined);
    const managerQuery = jest.fn();
    const commitTransaction = jest.fn();
    const rollbackTransaction = jest.fn();
    const release = jest.fn();

    const mockAdapter = {
      subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
      onStepStateChanged,
      canCompleteJob,
      onProcessCompleted,
    };

    beforeEach(async () => {
      jest.clearAllMocks();

      managerQuery.mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();

        if (normalized.includes('FROM process_instance_steps WHERE step_instance_id')) {
          return [
            {
              step_instance_id: 5,
              process_instance_id: 99,
              step_order: 1,
              status: 'ready',
              task_type: 'manual',
            },
          ];
        }

        if (normalized.includes('FROM process_instance_step_requirements')) {
          return [];
        }

        if (normalized.includes('FROM process_instance_step_triggers')) {
          return [];
        }

        if (normalized.includes('FROM process_instances')) {
          return [
            {
              tenant_id: 1,
              created_by: 2,
              process_instance_id: 99,
              process_template_id: 3,
              subject_type: PROCESS_SUBJECT_TYPE_PROJECT,
              subject_id: 10,
              subject_metadata: null,
              correlation_id: 'corr-1',
              context: null,
            },
          ];
        }

        if (normalized.includes('step_order = ? AND status = \'pending\'')) {
          return [];
        }

        if (normalized.includes('SELECT tenant_id, process_template_id')) {
          return [{ tenant_id: 1, process_template_id: 3 }];
        }

        return [];
      });

      testingModule = await Test.createTestingModule({
        providers: [
          StepOrchestratorService,
          {
            provide: DataSource,
            useValue: {
              createQueryRunner: () => ({
                connect: jest.fn(),
                startTransaction: jest.fn(),
                commitTransaction,
                rollbackTransaction,
                release,
                manager: { query: managerQuery },
              }),
            },
          },
          {
            provide: TriggerEngineService,
            useValue: { evaluate: jest.fn().mockResolvedValue(true) },
          },
          {
            provide: EventsService,
            useValue: { emit: jest.fn() },
          },
          {
            provide: ProcessHostRegistry,
            useValue: { get: jest.fn().mockReturnValue(mockAdapter) },
          },
          {
            provide: ConfigObjectStepExecutor,
            useValue: {
              provisionBindingsOnStepReady: jest.fn(),
              areMandatoryBindingsValid: jest.fn().mockResolvedValue(true),
            },
          },
          {
            provide: ChildProcessOrchestrationService,
            useValue: {
              isEnabled: jest.fn().mockReturnValue(false),
              spawnChildAndBlockParent: jest.fn(),
              markProcessCompletedIfEligible: jest.fn(),
              handleChildTerminal: jest.fn(),
            },
          },
          {
            provide: ProcessCompletionService,
            useValue: {
              canCompleteProcess: jest.fn().mockResolvedValue(false),
            },
          },
        ],
      }).compile();

      orchestrator = testingModule.get(StepOrchestratorService);
    });

    it('delegates step state changes to the process host adapter', async () => {
      await orchestrator.markCompleted(5, {
        cause: 'manual',
        correlationId: 'corr-1',
        actorTenantUserId: 7,
      });

      expect(onStepStateChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          stepInstanceId: 5,
          engineState: 'completed',
          subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
          advance: expect.objectContaining({
            correlationId: 'corr-1',
            actorTenantUserId: 7,
          }),
        }),
      );

      const taskQueries = managerQuery.mock.calls.filter(([sql]: [string]) =>
        /tasks/i.test(sql),
      );
      expect(taskQueries).toHaveLength(0);
    });

    it('invokes onProcessCompleted when canCompleteJob returns true', async () => {
      const completion = testingModule.get(ProcessCompletionService) as {
        canCompleteProcess: jest.Mock;
      };
      completion.canCompleteProcess.mockResolvedValueOnce(true);
      canCompleteJob.mockResolvedValueOnce(true);

      await orchestrator.markCompleted(5);

      expect(completion.canCompleteProcess).toHaveBeenCalled();
      expect(canCompleteJob).toHaveBeenCalled();
      expect(onProcessCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          processInstanceId: 99,
          subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
        }),
      );
    });
  });
});
