import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { EventsService } from '../events/events.service';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import { ProcessLifecycleFacade } from './process-lifecycle.facade';
import { ChildProcessOrchestrationService } from './child-process-orchestration.service';
import { ProcessStepActionOrchestrationService } from './process-step-action-orchestration.service';
import { PROCESS_BLOCKED_REASON_WAITING_CHILD } from './process-step-task-type.constants';

describe('ChildProcessOrchestrationService', () => {
  let service: ChildProcessOrchestrationService;
  let queryMock: jest.Mock;
  let transactionMock: jest.Mock;

  const emit = jest.fn();
  const startProcess = jest.fn().mockResolvedValue({ processInstanceId: 200 });
  const runStepCompleted = jest.fn().mockResolvedValue(undefined);
  const runStepFailed = jest.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    jest.clearAllMocks();
    queryMock = jest.fn();
    transactionMock = jest.fn(async (...args: unknown[]) => {
      const cb = args.find((arg) => typeof arg === 'function') as (
        em: { query: jest.Mock },
      ) => Promise<void>;
      return cb({ query: queryMock });
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChildProcessOrchestrationService,
        {
          provide: DataSource,
          useValue: { transaction: transactionMock, query: queryMock },
        },
        {
          provide: ProcessLifecycleFacade,
          useValue: { startProcess },
        },
        { provide: EventsService, useValue: { emit } },
        {
          provide: ProcessFeatureFlagsService,
          useValue: { isCallProcessEnabled: jest.fn().mockReturnValue(true) },
        },
        {
          provide: ProcessStepActionOrchestrationService,
          useValue: { runStepCompleted, runStepFailed, runProcessCompleted: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ChildProcessOrchestrationService);
  });

  describe('handleChildTerminal', () => {
    const childId = 200;
    const parentId = 100;
    const parentStepId = 50;

    function mockChildTerminalQueries(policy: string): void {
      queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();

        if (normalized.includes('FROM process_instances') && params?.[0] === childId) {
          return [
            {
              process_instance_id: childId,
              tenant_id: 1,
              created_by: 2,
              subject_type: 'workflow',
              subject_id: childId,
              subject_metadata: null,
              context: { childKey: 'v' },
              on_child_failure: policy,
              correlation_id: null,
              parent_instance_id: parentId,
              parent_step_id: parentStepId,
            },
          ];
        }

        if (normalized.includes('FROM process_instances') && params?.[0] === parentId) {
          return [
            {
              process_instance_id: parentId,
              tenant_id: 1,
              created_by: 2,
              subject_type: 'project',
              subject_id: 10,
              subject_metadata: null,
              context: { parentKey: 'p' },
              on_child_failure: policy,
              correlation_id: null,
              parent_instance_id: null,
              parent_step_id: null,
            },
          ];
        }

        if (normalized.startsWith('UPDATE process_instances SET context')) {
          return [];
        }

        if (normalized.includes("SET status = 'canceled'") && normalized.includes('process_instances')) {
          return [];
        }

        if (normalized.includes("SET status = 'canceled'") && normalized.includes('process_instance_steps')) {
          return [];
        }

        if (normalized.includes("SET status = 'completed'") && normalized.includes('process_instance_steps')) {
          return [];
        }

        if (normalized.includes('SELECT process_instance_id, step_order')) {
          return [{ process_instance_id: parentId, step_order: 1 }];
        }

        return [];
      });
    }

    it('pause_parent on cancel leaves parent blocked and does not complete parent step', async () => {
      mockChildTerminalQueries('pause_parent');

      await service.handleChildTerminal(childId, 'canceled');

      const completedParent = queryMock.mock.calls.some(
        ([sql]) =>
          sql.includes("SET status = 'completed'") &&
          sql.includes('process_instance_steps'),
      );
      expect(completedParent).toBe(false);
      expect(emit).toHaveBeenCalledWith(
        'six1-event.process_child_canceled',
        expect.objectContaining({
          data: expect.objectContaining({ resumedParent: false }),
        }),
      );
    });

    it('fail_parent on cancel cancels parent process and parent step', async () => {
      mockChildTerminalQueries('fail_parent');

      await service.handleChildTerminal(childId, 'canceled');

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'canceled'"),
        expect.arrayContaining([parentId]),
      );
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('process_instance_steps'),
        expect.arrayContaining([parentStepId]),
      );
      expect(runStepFailed).toHaveBeenCalledWith(
        parentStepId,
        expect.objectContaining({ correlationId: undefined }),
      );
    });

    it('ignore on cancel completes parent call_process step', async () => {
      mockChildTerminalQueries('ignore');

      await service.handleChildTerminal(childId, 'canceled');

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'completed'"),
        expect.arrayContaining([parentStepId]),
      );
      expect(emit).toHaveBeenCalledWith(
        'six1-event.process_child_canceled',
        expect.objectContaining({
          data: expect.objectContaining({ resumedParent: true }),
        }),
      );
    });

    it('completed child completes parent call_process step', async () => {
      mockChildTerminalQueries('pause_parent');

      await service.handleChildTerminal(childId, 'completed');

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'completed'"),
        expect.arrayContaining([parentStepId]),
      );
      expect(emit).toHaveBeenCalledWith(
        'six1-event.process_child_completed',
        expect.objectContaining({
          data: expect.objectContaining({ resumedParent: true }),
        }),
      );
      expect(runStepCompleted).toHaveBeenCalledWith(
        parentStepId,
        expect.any(Object),
      );
    });
  });

  describe('spawnChildAndBlockParent', () => {
    it('blocks parent step and starts child with skipHostOnStart', async () => {
      const emQuery = jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            process_instance_id: 100,
            tenant_id: 1,
            created_by: 2,
            subject_type: 'project',
            subject_id: 10,
            subject_metadata: null,
            context: {},
            on_child_failure: 'pause_parent',
            correlation_id: 'c1',
          },
        ])
        .mockResolvedValueOnce([
          {
            child_template_id: 5,
            child_subject_policy: 'workflow',
            child_context_patch: null,
          },
        ])
        .mockResolvedValue([]);

      const qr = { manager: { query: emQuery } } as never;

      const spawned = await service.spawnChildAndBlockParent(
        qr,
        {
          step_instance_id: 50,
          process_instance_id: 100,
          process_template_step_id: 9,
          step_order: 1,
          status: 'pending',
          task_type: 'call_process',
        },
        { correlationId: 'c1', actorTenantUserId: 2 },
      );

      expect(spawned).toBe(true);
      expect(startProcess).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 5,
          parentInstanceId: 100,
          parentStepId: 50,
          skipHostOnStart: true,
        }),
      );
      expect(emQuery).toHaveBeenCalledWith(
        expect.stringContaining('blocked_reason'),
        expect.arrayContaining([
          PROCESS_BLOCKED_REASON_WAITING_CHILD,
          50,
        ]),
      );
    });
  });
});
