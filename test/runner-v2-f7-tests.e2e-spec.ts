import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { EventsService } from '../src/events/events.service';
import { TriggerEngineService } from '../src/automation/trigger-engine.service';
import { ProcessHostRegistry } from '../src/automation/process-host/process-host.registry';
import { ConfigObjectStepExecutor } from '../src/automation/config-object-step-executor.service';
import { ChildProcessOrchestrationService } from '../src/automation/child-process-orchestration.service';
import { ProcessCompletionService } from '../src/automation/process-completion.service';
import { ProcessStepActionOrchestrationService } from '../src/automation/process-step-action-orchestration.service';
import { ProcessStepExecutionLogService } from '../src/automation/process-step-execution-log.service';
import { ProcessStepAssigneeService } from '../src/automation/process-step-assignee.service';
import { ProcessStepExtensionEvaluatorService } from '../src/automation/process-step-extension-evaluator.service';
import { StepOrchestratorService } from '../src/automation/step-orchestrator.service';
import { createSqlRouter, normalizeSql } from './fixtures/dynamic-process-sql-router';

/**
 * F7 — Runner v2 integration coverage (SQL-router e2e style).
 * Chains real {@link StepOrchestratorService} behavior; DB is simulated.
 */
describe('Runner v2 — F7 tests (e2e)', () => {
  const tenantId = 5;
  const processInstanceId = 900;
  const subjectType = 'workflow';
  const subjectId = 42;
  const correlationId = 'corr-f7';

  function processInstanceRow(overrides: Record<string, unknown> = {}) {
    return [
      {
        tenant_id: tenantId,
        created_by: 9,
        process_instance_id: processInstanceId,
        process_template_id: 10,
        subject_type: subjectType,
        subject_id: subjectId,
        subject_metadata: null,
        correlation_id: correlationId,
        context: JSON.stringify({ tier: 'basic' }),
        ...overrides,
      },
    ];
  }

  function makeModule(router: ReturnType<typeof createSqlRouter>, opts?: {
    isVisible?: boolean;
  }): Promise<TestingModule> {
    const onStepStateChanged = jest.fn().mockResolvedValue(undefined);

    const ds = {
      createQueryRunner: () => ({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: { query: router.query },
      }),
    } as unknown as DataSource;

    return Test.createTestingModule({
      providers: [
        StepOrchestratorService,
        { provide: DataSource, useValue: ds },
        {
          provide: TriggerEngineService,
          useValue: { evaluate: jest.fn().mockResolvedValue(true) },
        },
        { provide: EventsService, useValue: { emit: jest.fn() } },
        {
          provide: ProcessHostRegistry,
          useValue: {
            get: jest.fn().mockReturnValue({
              subjectType,
              onStepStateChanged,
              canCompleteJob: jest.fn().mockResolvedValue(false),
              onProcessCompleted: jest.fn().mockResolvedValue(undefined),
            }),
          },
        },
        {
          provide: ConfigObjectStepExecutor,
          useValue: {
            provisionBindingsOnStepReady: jest.fn().mockResolvedValue(undefined),
            areMandatoryBindingsValid: jest.fn().mockResolvedValue(true),
            skipBindingsForStep: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ChildProcessOrchestrationService,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(false),
            spawnChildAndBlockParent: jest.fn().mockResolvedValue(false),
            markProcessCompletedIfEligible: jest.fn().mockResolvedValue(undefined),
            handleChildTerminal: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ProcessCompletionService,
          useValue: { canCompleteProcess: jest.fn().mockResolvedValue(false) },
        },
        {
          provide: ProcessStepActionOrchestrationService,
          useValue: {
            runStepCompleted: jest.fn().mockResolvedValue(undefined),
            runStepFailed: jest.fn().mockResolvedValue(undefined),
            runProcessCompleted: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ProcessStepExecutionLogService,
          useValue: {
            recordTransition: jest.fn().mockResolvedValue(undefined),
            recordCustomEvent: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ProcessStepAssigneeService,
          useValue: {
            resolveForStep: jest
              .fn()
              .mockResolvedValue({ assigneeIds: [], primaryAssigneeId: null }),
          },
        },
        {
          provide: ProcessStepExtensionEvaluatorService,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(true),
            evaluate: jest.fn().mockReturnValue({
              isVisible: opts?.isVisible ?? true,
              autoAdvanceEligible: false,
              visibleWhenResult: opts?.isVisible ?? true,
              autoAdvanceWhenResult: null,
            }),
          },
        },
      ],
    }).compile();
  }

  it('Integration: visible step hidden → skipped on advance', async () => {
    const hiddenStepId = 2002;
    const router = createSqlRouter([
      {
        match: /SELECT \* FROM process_instance_steps WHERE step_instance_id = \? FOR UPDATE/i,
        handle: (_sql, params) => {
          const stepId = Number(params?.[0]);
          if (stepId === hiddenStepId) {
            return [
              {
                step_instance_id: hiddenStepId,
                process_instance_id: processInstanceId,
                process_template_step_id: 22,
                step_order: 2,
                status: 'pending',
                task_type: 'manual',
                name: 'Hidden step',
                is_optional: 0,
                step_extensions_json: { visibleWhen: { '==': [1, 0] } },
              },
            ];
          }
          return [];
        },
      },
      {
        match: /FROM process_instance_step_requirements/i,
        handle: () => [],
      },
      {
        match: /FROM process_instance_step_triggers/i,
        handle: () => [],
      },
      {
        match: /FROM process_instance_step_object_instances/i,
        handle: () => [],
      },
      {
        match: /FROM process_instances/i,
        handle: () => processInstanceRow(),
      },
      {
        match: /UPDATE process_instance_steps SET status = \?/i,
        handle: () => ({ affectedRows: 1 }),
      },
    ]);

    const module = await makeModule(router, { isVisible: false });
    const orchestrator = module.get(StepOrchestratorService);
    const executionLog = module.get(ProcessStepExecutionLogService) as {
      recordTransition: jest.Mock;
    };

    await orchestrator.attemptAdvance(hiddenStepId, { cause: 'event' });

    expect(executionLog.recordTransition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stepInstanceId: hiddenStepId,
        previousStatus: 'pending',
        newStatus: 'skipped',
        metadata: expect.objectContaining({
          action: 'skipped',
          reason: 'hidden',
        }),
      }),
    );
  });

  it('Integration: skip optional step → process continues', async () => {
    const stepToSkipId = 3001;
    const nextStepId = 3002;

    const router = createSqlRouter([
      {
        match: /SELECT \* FROM process_instance_steps WHERE step_instance_id = \? FOR UPDATE/i,
        handle: (_sql, params) => {
          const stepId = Number(params?.[0]);
          if (stepId === stepToSkipId) {
            return [
              {
                step_instance_id: stepToSkipId,
                process_instance_id: processInstanceId,
                process_template_step_id: 30,
                step_order: 1,
                status: 'ready',
                task_type: 'manual',
                name: 'Optional step',
                is_optional: 1,
                step_extensions_json: null,
              },
            ];
          }
          return [];
        },
      },
      {
        match: /WHERE process_instance_id = \? AND step_order = \? AND status = 'pending'/i,
        handle: (_sql, params) => {
          const order = Number(params?.[1]);
          if (order === 2) {
            return [
              {
                step_instance_id: nextStepId,
                process_instance_id: processInstanceId,
                process_template_step_id: 31,
                step_order: 2,
                status: 'pending',
                task_type: 'manual',
                name: 'Next step',
                is_optional: 0,
                step_extensions_json: null,
              },
            ];
          }
          return [];
        },
      },
      { match: /FROM process_instance_step_requirements/i, handle: () => [] },
      { match: /FROM process_instance_step_triggers/i, handle: () => [] },
      { match: /FROM process_instance_step_object_instances/i, handle: () => [] },
      { match: /FROM process_instances/i, handle: () => processInstanceRow() },
      {
        match: /SELECT SUM\(status IN \('completed', 'skipped'\)\) AS done, COUNT\(\*\) AS total/i,
        handle: () => [{ done: 1, total: 2 }],
      },
      {
        match: /SELECT status, parent_step_id FROM process_instances/i,
        handle: () => [{ status: 'active', parent_step_id: null }],
      },
      { match: /UPDATE process_instance_steps SET status = \?/i, handle: () => [] },
    ]);

    const module = await makeModule(router, { isVisible: true });
    const orchestrator = module.get(StepOrchestratorService);
    const executionLog = module.get(ProcessStepExecutionLogService) as {
      recordTransition: jest.Mock;
    };

    await orchestrator.markSkipped(stepToSkipId, {
      failOnPrecondition: true,
      expectedProcessInstanceId: processInstanceId,
      actorTenantUserId: 9,
    });

    const normalizedTransitions = executionLog.recordTransition.mock.calls.map(
      ([_qr, evt]: [unknown, Record<string, unknown>]) => ({
        stepInstanceId: evt.stepInstanceId,
        newStatus: evt.newStatus,
      }),
    );

    expect(normalizedTransitions).toEqual(
      expect.arrayContaining([
        { stepInstanceId: stepToSkipId, newStatus: 'skipped' },
        { stepInstanceId: nextStepId, newStatus: 'ready' },
      ]),
    );
  });

  it('Integration: failed webhook → retry → complete', async () => {
    const stepId = 4001;

    const transitions: Array<{ to: string }> = [];
    let status = 'in_progress';

    const router = createSqlRouter(
      [
        {
          match: /SELECT \* FROM process_instance_steps WHERE step_instance_id = \? FOR UPDATE/i,
          handle: () => [
            {
              step_instance_id: stepId,
              process_instance_id: processInstanceId,
              process_template_step_id: 40,
              step_order: 1,
              status,
              task_type: 'automated',
              name: 'Webhook step',
              is_optional: 0,
              step_extensions_json: null,
            },
          ],
        },
        { match: /FROM process_instance_step_requirements/i, handle: () => [] },
        { match: /FROM process_instance_step_triggers/i, handle: () => [] },
        { match: /FROM process_instance_step_object_instances/i, handle: () => [] },
        { match: /FROM process_instances/i, handle: () => processInstanceRow() },
        {
          match: /UPDATE process_instance_steps\s+SET status = 'ready'/i,
          handle: () => {
            status = 'ready';
            transitions.push({ to: 'ready' });
            return { affectedRows: 1 };
          },
        },
        {
          match: /UPDATE process_instance_steps SET status = \?/i,
          handle: (_sql, params) => {
            const next = String(params?.[0]);
            status = next;
            transitions.push({ to: next });
            return { affectedRows: 1 };
          },
        },
        {
          match: /SELECT step_instance_id,\s+process_instance_id.*status = 'skipped'/i,
          handle: () => [],
        },
        {
          match: /SELECT SUM\(status IN \('completed', 'skipped'\)\) AS done, COUNT\(\*\) AS total/i,
          handle: () => [{ done: 1, total: 1 }],
        },
        {
          match: /SELECT status, parent_step_id FROM process_instances/i,
          handle: () => [{ status: 'active', parent_step_id: null }],
        },
      ],
      (sql) => {
        const n = normalizeSql(sql);
        if (n.includes('UPDATE process_instance_steps') || n.includes('SELECT')) {
          return [];
        }
        return [];
      },
    );

    const module = await makeModule(router, { isVisible: true });
    const orchestrator = module.get(StepOrchestratorService);

    // Simulate webhook executor failure marking the step failed.
    await orchestrator.markFailed(stepId, {
      errorCode: 'webhook_failed',
      errorDetail: 'partner 500',
    });
    expect(status).toBe('failed');

    // Operator retries the failed step (failed -> ready).
    await orchestrator.retry(stepId, { cause: 'manual' });
    expect(status).toBe('ready');

    // Next runner tick advances the automated step to completion.
    await orchestrator.attemptAdvance(stepId, { cause: 'event' });
    expect(status).toBe('completed');

    expect(transitions.map((t) => t.to)).toEqual(
      expect.arrayContaining(['failed', 'ready', 'in_progress', 'completed']),
    );
  });
});

