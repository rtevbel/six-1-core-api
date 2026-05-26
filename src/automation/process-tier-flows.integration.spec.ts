import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProcessLifecycleFacade } from './process-lifecycle.facade';
import { ProcessInstantiationService } from './process-instantiation.service';
import { ProcessHostRegistry } from './process-host/process-host.registry';
import { ProjectHostAdapter } from './process-host/project-host.adapter';
import { ScheduledTaskHostAdapter } from './process-host/scheduled-task-host.adapter';
import { ConfigurableInstanceHostAdapter } from './process-host/configurable-instance-host.adapter';
import { GenericWorkflowHostAdapter } from './process-host/generic-workflow-host.adapter';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import { ProcessCompletionService } from './process-completion.service';
import { ConfigObjectStepExecutor } from './config-object-step-executor.service';
import { EventsService } from '../events/events.service';
import { ConfigCustomObjectInstanceEntity } from '../config_objects/entities/config_custom_object_instance.entity';
import {
  PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE,
  PROCESS_SUBJECT_TYPE_SCHEDULED_TASK,
  PROCESS_SUBJECT_TYPE_WORKFLOW,
} from './process-subject.constants';

type RecordedQuery = { sql: string; params: unknown[] };

function createRecordingEntityManager(): EntityManager & {
  recorded: RecordedQuery[];
} {
  const recorded: RecordedQuery[] = [];
  const em = {
    recorded,
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      recorded.push({ sql, params: params ?? [] });
      const normalized = sql.replace(/\s+/g, ' ').trim();

      if (
        normalized.includes('FROM process_instance_steps') &&
        normalized.includes('ORDER BY step_order')
      ) {
        return [{ step_instance_id: 501, name: 'Step 1', status: 'pending' }];
      }

      if (
        normalized.includes('SELECT step_instance_id') &&
        normalized.includes('LIMIT 1')
      ) {
        return [{ step_instance_id: 501 }];
      }

      if (normalized.includes('FROM process_instance_steps') && normalized.includes('SUM')) {
        return [{ completed_count: 1, total_count: 1 }];
      }

      if (normalized.includes('UPDATE process_instances') && normalized.includes('subject_id')) {
        return { affectedRows: 1 };
      }

      if (normalized.includes('FROM config_custom_object_instances')) {
        return [
          {
            config_custom_object_instance_id: 77,
            tenant_id: 1,
            status: 'DRAFT',
          },
        ];
      }

      return [];
    }),
  } as unknown as EntityManager & { recorded: RecordedQuery[] };

  return em;
}

function assertNoKanbanTaskSql(recorded: RecordedQuery[]): void {
  const taskSql = recorded.map((r) => r.sql).join(' ');
  expect(taskSql).not.toMatch(/INSERT\s+INTO\s+tasks/i);
  expect(taskSql).not.toMatch(/UPDATE\s+tasks/i);
}

describe('Process tier flows (integration)', () => {
  let facade: ProcessLifecycleFacade;
  const instantiation = {
    instantiateProcessIn: jest.fn().mockResolvedValue(42),
  };

  const flags = {
    isSubjectModelEnabled: jest.fn().mockReturnValue(true),
    isTier2InstanceSubjectEnabled: jest.fn().mockReturnValue(true),
    isTier3WorkflowSubjectEnabled: jest.fn().mockReturnValue(true),
    isTier1ScheduledTaskEnabled: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessLifecycleFacade,
        ProcessHostRegistry,
        ProjectHostAdapter,
        ScheduledTaskHostAdapter,
        ConfigurableInstanceHostAdapter,
        GenericWorkflowHostAdapter,
        ProcessCompletionService,
        {
          provide: ConfigObjectStepExecutor,
          useValue: { areMandatoryBindingsValid: jest.fn().mockResolvedValue(true) },
        },
        { provide: ProcessInstantiationService, useValue: instantiation },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: EventsService, useValue: { emit: jest.fn() } },
        { provide: ProcessFeatureFlagsService, useValue: flags },
        {
          provide: getRepositoryToken(ConfigCustomObjectInstanceEntity),
          useValue: { findOne: jest.fn().mockResolvedValue({ status: 'DRAFT' }) },
        },
      ],
    }).compile();

    facade = module.get(ProcessLifecycleFacade);
  });

  it('Tier 1 scheduled_task: starts without seeding kanban tasks', async () => {
    const em = createRecordingEntityManager();

    await facade.startProcessForScheduledTask({
      tenantId: 1,
      createdBy: 2,
      templateId: 9,
      scheduledTaskId: 50,
      entityManager: em,
    });

    assertNoKanbanTaskSql(em.recorded);
    expect(instantiation.instantiateProcessIn).toHaveBeenCalledWith(
      em,
      9,
      1,
      2,
      expect.objectContaining({
        subject: expect.objectContaining({
          subjectType: PROCESS_SUBJECT_TYPE_SCHEDULED_TASK,
          subjectId: 50,
        }),
      }),
    );
    expect(
      em.recorded.some((r) => r.sql.includes('UPDATE scheduled_tasks')),
    ).toBe(true);
  });

  it('Tier 2 config instance: starts without seeding kanban tasks', async () => {
    const em = createRecordingEntityManager();

    await facade.startProcess({
      tenantId: 1,
      createdBy: 2,
      templateId: 8,
      subjectType: PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE,
      subjectId: 77,
      entityManager: em,
    });

    assertNoKanbanTaskSql(em.recorded);
    expect(instantiation.instantiateProcessIn).toHaveBeenCalledWith(
      em,
      8,
      1,
      2,
      expect.objectContaining({
        subject: expect.objectContaining({
          subjectType: PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE,
          subjectId: 77,
        }),
      }),
    );
  });

  it('Tier 3 workflow: starts without seeding kanban tasks', async () => {
    const em = createRecordingEntityManager();

    await facade.startWorkflowProcess({
      tenantId: 1,
      createdBy: 2,
      templateId: 7,
      context: { customerId: 5 },
      entityManager: em,
    });

    assertNoKanbanTaskSql(em.recorded);
    expect(instantiation.instantiateProcessIn).toHaveBeenCalledWith(
      em,
      7,
      1,
      2,
      expect.objectContaining({
        subject: expect.objectContaining({
          subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
        }),
        context: { customerId: 5 },
      }),
    );
  });
});
