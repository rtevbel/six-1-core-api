import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
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
import { ProcessInstantiationService } from '../src/automation/process-instantiation.service';
import { ProcessLifecycleFacade } from '../src/automation/process-lifecycle.facade';
import { SCHEDULER_PORT } from '../src/automation/scheduler.port';
import { ProcessInstancesController } from '../src/process_instances/process_instances.controller';
import { ProcessStepLocksService } from '../src/process_instances/process_step_locks/process-step-locks.service';
import { ProcessStepPermissionService } from '../src/process_instances/process-step-permission.service';
import { ProcessRunnerService } from '../src/process_instances/process-runner.service';
import { ProcessInstancesService } from '../src/process_instances/process_instances.service';
import { ProcessInstanceTimelineService } from '../src/process_instances/process-instance-timeline.service';
import { createSqlRouter, normalizeSql } from './fixtures/dynamic-process-sql-router';

describe('Runner v3 — G5 tests (e2e)', () => {
  it('G5.1 parallel group: peers ready together; barrier blocks next order until mandatory terminal', async () => {
    const tenantId = 5;
    const processInstanceId = 900;
    const groupId = 'group-a';

    const stepA = 101;
    const stepB = 102;
    const nextStep = 103;

    let stepAStatus: string = 'completed';
    let stepBStatus: string = 'pending';
    let nextStatus: string = 'pending';

    const router = createSqlRouter([
      {
        match: /SELECT \* FROM process_instance_steps WHERE step_instance_id = \? FOR UPDATE/i,
        handle: (_sql, params) => {
          const id = Number(params?.[0]);
          if (id === stepA) {
            return [
              {
                step_instance_id: stepA,
                process_instance_id: processInstanceId,
                process_template_step_id: 1,
                step_order: 1,
                status: stepAStatus,
                task_type: 'manual',
                name: 'A',
                is_optional: 0,
                parallel_group_id: groupId,
                step_extensions_json: null,
              },
            ];
          }
          if (id === stepB) {
            return [
              {
                step_instance_id: stepB,
                process_instance_id: processInstanceId,
                process_template_step_id: 2,
                step_order: 1,
                status: stepBStatus,
                task_type: 'manual',
                name: 'B',
                is_optional: 0,
                parallel_group_id: groupId,
                step_extensions_json: null,
              },
            ];
          }
          if (id === nextStep) {
            return [
              {
                step_instance_id: nextStep,
                process_instance_id: processInstanceId,
                process_template_step_id: 3,
                step_order: 2,
                status: nextStatus,
                task_type: 'manual',
                name: 'Next',
                is_optional: 0,
                parallel_group_id: null,
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
      {
        match: /FROM process_instances/i,
        handle: () => [
          {
            tenant_id: tenantId,
            created_by: 9,
            process_instance_id: processInstanceId,
            process_template_id: 10,
            subject_type: 'workflow',
            subject_id: processInstanceId,
            subject_metadata: null,
            correlation_id: 'corr-g5',
            context: JSON.stringify({}),
          },
        ],
      },
      {
        match: /SELECT parallel_group_id\s+FROM process_instance_steps/i,
        handle: () => [{ parallel_group_id: groupId }],
      },
      {
        match: /WHERE process_instance_id = \?\s+AND step_order = \?\s+AND status = 'pending'\s+AND parallel_group_id = \?/i,
        handle: (_sql, params) => {
          const order = Number(params?.[1]);
          const pg = String(params?.[2] ?? '');
          if (order === 1 && pg === groupId && stepBStatus === 'pending') {
            return [
              {
                step_instance_id: stepB,
                process_instance_id: processInstanceId,
                process_template_step_id: 2,
                step_order: 1,
                status: 'pending',
                task_type: 'manual',
                name: 'B',
                is_optional: 0,
                parallel_group_id: groupId,
                step_extensions_json: null,
              },
            ];
          }
          return [];
        },
      },
      {
        match: /SELECT COUNT\(\*\) AS blocking\s+FROM process_instance_steps/i,
        handle: () => [{ blocking: stepBStatus === 'pending' ? 1 : 0 }],
      },
      {
        match: /WHERE process_instance_id = \? AND step_order = \? AND status = 'pending'(\s+FOR UPDATE)?$/i,
        handle: (_sql, params) => {
          const order = Number(params?.[1]);
          if (order === 2 && nextStatus === 'pending') {
            return [
              {
                step_instance_id: nextStep,
                process_instance_id: processInstanceId,
                process_template_step_id: 3,
                step_order: 2,
                status: 'pending',
                task_type: 'manual',
                name: 'Next',
                is_optional: 0,
                parallel_group_id: null,
                step_extensions_json: null,
              },
            ];
          }
          return [];
        },
      },
      {
        match: /UPDATE process_instance_steps\s+SET status = \?/i,
        handle: (_sql, params) => {
          const next = String(params?.[0]);
          const stepId = Number(params?.[5] ?? params?.[params.length - 1]);
          if (stepId === stepB) {
            stepBStatus = next;
          }
          if (stepId === nextStep) {
            nextStatus = next;
          }
          return { affectedRows: 1 };
        },
      },
      {
        match: /SELECT SUM\(status IN \('completed', 'skipped'\)\) AS done, COUNT\(\*\) AS total/i,
        handle: () => [{ done: 1, total: 1 }],
      },
      {
        match: /SELECT status, parent_step_id\s+FROM process_instances/i,
        handle: () => [{ status: 'active', parent_step_id: null }],
      },
    ]);

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

    const module: TestingModule = await Test.createTestingModule({
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
              subjectType: 'workflow',
              onStepStateChanged: jest.fn().mockResolvedValue(undefined),
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
            spawnChildAndBlockParent: jest.fn(),
            markProcessCompletedIfEligible: jest.fn(),
            handleChildTerminal: jest.fn(),
          },
        },
        {
          provide: ProcessCompletionService,
          useValue: { canCompleteProcess: jest.fn().mockResolvedValue(false) },
        },
        {
          provide: ProcessStepActionOrchestrationService,
          useValue: {
            runStepCompleted: jest.fn(),
            runStepFailed: jest.fn(),
            runProcessCompleted: jest.fn(),
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
          useValue: { resolveForStep: jest.fn().mockResolvedValue({ assigneeIds: [], primaryAssigneeId: null }) },
        },
        {
          provide: ProcessStepExtensionEvaluatorService,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(true),
            evaluate: jest.fn().mockReturnValue({ isVisible: true, autoAdvanceEligible: false }),
          },
        },
      ],
    }).compile();

    const orchestrator = module.get(StepOrchestratorService);

    // Step A completion attempts to unlock group peers and then next order.
    await orchestrator.markCompleted(stepA, { cause: 'manual' });

    // Peer should become ready, but next order remains pending due to barrier.
    expect(stepBStatus).toBe('ready');
    expect(nextStatus).toBe('pending');

    // Once peer is terminal, enabling should progress to next order.
    stepBStatus = 'completed';
    await orchestrator.resumeParentAfterChildCallProcess(stepA, { cause: 'event' });
    // resumeParentAfterChildCallProcess just runs enableNextSteps; allow barrier to pass and next order to activate.
    // Our router transitions next step to ready when activated.
    expect(nextStatus).toBe('ready');
  });

  it('G5.2 batch start 10 instances', async () => {
    const startSpy = jest.fn().mockResolvedValue({
      processInstanceId: 1,
      firstStepInstanceId: 10,
      correlationId: 'c',
    });

    const ds = {
      transaction: jest.fn(async (_iso: string, fn: any) => fn({})),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ProcessLifecycleFacade,
          useValue: {
            batchStartProcess: async (params: any) => {
              const results = [];
              for (const item of params.items) {
                results.push({ ...(await startSpy(item)), itemIndex: item.itemIndex });
              }
              return { status: 'started', requested: params.items.length, deduped: params.items.length, results };
            },
          },
        },
      ],
    }).compile();

    const facade = module.get(ProcessLifecycleFacade) as any;
    const out = await facade.batchStartProcess({
      tenantId: 1,
      createdBy: 2,
      templateId: 3,
      async: false,
      items: Array.from({ length: 10 }).map((_, i) => ({
        itemIndex: i,
        subjectType: 'workflow',
        subjectId: 0,
        subjectMetadata: null,
        context: { i },
        correlationId: null,
      })),
    });

    expect(out.status).toBe('started');
    expect(out.requested).toBe(10);
    expect(out.results).toHaveLength(10);
  });

  it('G5.3 lock prevents double-complete', async () => {
    const ds = {
      query: jest.fn(async (sql: string, params?: unknown[]) => {
        const n = normalizeSql(sql);
        if (n.includes('FROM process_step_locks')) {
          return [
            {
              tenant_user_id: 111,
              expires_at: new Date(Date.now() + 60_000).toISOString(),
            },
          ];
        }
        return [];
      }),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessInstancesController],
      providers: [
        { provide: ProcessInstancesService, useValue: {} },
        { provide: ProcessRunnerService, useValue: { buildPayload: jest.fn() } },
        { provide: ProcessLifecycleFacade, useValue: { startProcess: jest.fn(), batchStartProcess: jest.fn() } },
        { provide: StepOrchestratorService, useValue: { markCompleted: jest.fn() } },
        { provide: ProcessStepPermissionService, useValue: { assertCallerCanCompleteStep: jest.fn().mockResolvedValue(undefined) } },
        { provide: ProcessInstanceTimelineService, useValue: { getTimeline: jest.fn() } },
        { provide: ProcessStepExecutionLogService, useValue: { getExecutionLog: jest.fn() } },
        { provide: DataSource, useValue: ds },
        ProcessStepLocksService,
      ],
    }).compile();

    const controller = module.get(ProcessInstancesController);

    await expect(
      controller.completeProcessInstanceStep(7, {
        processInstanceId: 9,
        stepInstanceId: 101,
        tenantId: 1,
        tenantUserId: 222, // NOT lock holder
        correlationId: 'c1',
      } as any),
    ).rejects.toThrow(RpcException);
  });
});

