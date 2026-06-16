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
import { ProcessStepActionOrchestrationService } from './process-step-action-orchestration.service';
import { ProcessStepAssigneeService } from './process-step-assignee.service';
import { ProcessStepExecutionLogService } from './process-step-execution-log.service';
import { PROCESS_SUBJECT_TYPE_PROJECT } from './process-subject.constants';
import { ProcessStepExtensionEvaluatorService } from './process-step-extension-evaluator.service';

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
    const runStepCompleted = jest.fn().mockResolvedValue(undefined);
    const runProcessCompleted = jest.fn().mockResolvedValue(undefined);
    const recordTransition = jest.fn().mockResolvedValue(undefined);
    const recordCustomEvent = jest.fn().mockResolvedValue(undefined);
    const managerQuery = jest.fn();
    const evaluateExtensions = jest.fn().mockReturnValue({
      isVisible: true,
      autoAdvanceEligible: false,
      visibleWhenResult: null,
      autoAdvanceWhenResult: null,
    });
    const isRunnerV2Enabled = jest.fn().mockReturnValue(false);
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

        if (normalized.includes('SUM(status = \'completed\')')) {
          return [{ done: 1, total: 1 }];
        }

        if (normalized.includes('SELECT status, parent_step_id')) {
          return [{ status: 'active', parent_step_id: null }];
        }

        if (normalized.startsWith('UPDATE process_instances')) {
          return [];
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
              skipBindingsForStep: jest.fn().mockResolvedValue(undefined),
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
          {
            provide: ProcessStepActionOrchestrationService,
            useValue: {
              runStepCompleted,
              runStepFailed: jest.fn(),
              runProcessCompleted,
            },
          },
        {
          provide: ProcessStepExecutionLogService,
          useValue: { recordTransition, recordCustomEvent },
        },
        {
          provide: ProcessStepAssigneeService,
          useValue: {
            resolveForStep: jest
              .fn()
              .mockResolvedValue({ assigneeIds: [42], primaryAssigneeId: 42 }),
          },
        },
          {
            provide: ProcessStepExtensionEvaluatorService,
            useValue: {
              evaluate: evaluateExtensions,
              isEnabled: isRunnerV2Enabled,
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
      expect(runStepCompleted).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          correlationId: 'corr-1',
          actorUserId: 7,
        }),
      );
      expect(recordTransition).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          stepInstanceId: 5,
          newStatus: 'completed',
          cause: 'manual',
          actorTenantUserId: 7,
        }),
      );
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
      expect(runProcessCompleted).toHaveBeenCalledWith(
        99,
        expect.objectContaining({ correlationId: 'corr-1' }),
      );
    });

    it('defers hidden pending steps as skipped when runner v2 is enabled', async () => {
      isRunnerV2Enabled.mockReturnValue(true);
      evaluateExtensions.mockReturnValue({
        isVisible: false,
        autoAdvanceEligible: false,
        visibleWhenResult: false,
        autoAdvanceWhenResult: null,
      });

      managerQuery.mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();

        if (normalized.includes('FROM process_instance_steps WHERE step_instance_id')) {
          return [
            {
              step_instance_id: 5,
              process_instance_id: 99,
              step_order: 2,
              status: 'pending',
              task_type: 'manual',
              is_optional: 0,
              step_extensions_json: { visibleWhen: { '==': [1, 0] } },
            },
          ];
        }

        if (normalized.includes("status = 'skipped'")) {
          return [];
        }

        if (normalized.includes('FROM process_instance_step_requirements')) {
          return [];
        }

        if (normalized.includes('FROM process_instance_step_triggers')) {
          return [];
        }

        if (normalized.includes('FROM process_instance_step_object_instances')) {
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
              context: { tier: 'basic' },
            },
          ];
        }

        if (normalized.startsWith('UPDATE process_instance_steps')) {
          return [];
        }

        return [];
      });

      await orchestrator.attemptAdvance(5, { cause: 'event' });

      expect(recordTransition).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          stepInstanceId: 5,
          previousStatus: 'pending',
          newStatus: 'skipped',
        }),
      );
      expect(onStepStateChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          stepInstanceId: 5,
          engineState: 'skipped',
        }),
      );
    });

    it('markSkipped transitions step, skips bindings, and unlocks next order', async () => {
      isRunnerV2Enabled.mockReturnValue(true);
      const configExecutor = testingModule.get(ConfigObjectStepExecutor);

      managerQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();

        if (normalized.includes('FROM process_instance_steps WHERE step_instance_id')) {
          return [
            {
              step_instance_id: 5,
              process_instance_id: 99,
              step_order: 1,
              status: 'ready',
              task_type: 'manual',
              is_optional: 0,
              step_extensions_json: { allowSkip: true },
            },
          ];
        }

        if (normalized.includes("status = 'skipped'")) {
          return [];
        }

        if (normalized.includes('step_order = ? AND status = \'pending\'')) {
          if (Number(params?.[1]) === 2) {
            return [
              {
                step_instance_id: 6,
                process_instance_id: 99,
                step_order: 2,
                status: 'pending',
                task_type: 'manual',
                name: 'Next',
                is_optional: 0,
                step_extensions_json: null,
              },
            ];
          }
          return [];
        }

        if (normalized.includes('FROM process_instance_step_requirements')) {
          return [];
        }

        if (normalized.includes('FROM process_instance_step_triggers')) {
          return [];
        }

        if (normalized.includes('FROM process_instance_step_object_instances')) {
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

        if (normalized.includes('SUM(status IN')) {
          return [{ done: 1, total: 2 }];
        }

        if (normalized.includes('SELECT status, parent_step_id')) {
          return [{ status: 'active', parent_step_id: null }];
        }

        if (normalized.startsWith('UPDATE process_instance_steps')) {
          return [];
        }

        return [];
      });

      await orchestrator.markSkipped(5, {
        cause: 'manual',
        failOnPrecondition: true,
        expectedProcessInstanceId: 99,
        actorTenantUserId: 7,
      });

      expect(configExecutor.skipBindingsForStep).toHaveBeenCalledWith(
        expect.anything(),
        5,
      );
      expect(recordTransition).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          stepInstanceId: 5,
          newStatus: 'skipped',
          cause: 'manual',
          metadata: expect.objectContaining({ action: 'skipped' }),
        }),
      );
      expect(recordTransition).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          stepInstanceId: 6,
          newStatus: 'ready',
        }),
      );
    });
  });
});
