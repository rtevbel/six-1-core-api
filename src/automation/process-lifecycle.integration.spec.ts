import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { ProcessLifecycleFacade } from './process-lifecycle.facade';
import { ProcessInstantiationService } from './process-instantiation.service';
import { ProcessHostRegistry } from './process-host/process-host.registry';
import { ProjectHostAdapter } from './process-host/project-host.adapter';
import { ConfigurableInstanceHostAdapter } from './process-host/configurable-instance-host.adapter';
import { GenericWorkflowHostAdapter } from './process-host/generic-workflow-host.adapter';
import { ScheduledTaskHostAdapter } from './process-host/scheduled-task-host.adapter';
import { ProcessCompletionService } from './process-completion.service';
import { ConfigObjectStepExecutor } from './config-object-step-executor.service';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import { EventsService } from '../events/events.service';
import { ConfigCustomObjectInstanceEntity } from '../config_objects/entities/config_custom_object_instance.entity';
import {
  PROCESS_SUBJECT_TYPE_PROJECT,
  PROCESS_SUBJECT_TYPE_WORKFLOW,
} from './process-subject.constants';

type RecordedQuery = { sql: string; params: unknown[] };

function createRecordingEntityManager(
  stepRows: Array<{
    step_instance_id: number;
    name: string;
    status: string;
    step_order?: number;
  }>,
): EntityManager & { recorded: RecordedQuery[] } {
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
        return stepRows;
      }

      if (
        normalized.includes('SELECT step_instance_id') &&
        normalized.includes('LIMIT 1')
      ) {
        return stepRows.length
          ? [{ step_instance_id: stepRows[0].step_instance_id }]
          : [];
      }

      if (normalized.includes('FROM project_step_status_mappings')) {
        return [
          { step_engine_state: 'pending', task_status_id: 1 },
          { step_engine_state: 'ready', task_status_id: 2 },
        ];
      }

      if (normalized.includes('UPDATE process_instances') && normalized.includes('subject_id')) {
        return { affectedRows: 1 };
      }

      return [];
    }),
  } as unknown as EntityManager & { recorded: RecordedQuery[] };

  return em;
}

describe('ProcessLifecycleFacade (integration)', () => {
  let facade: ProcessLifecycleFacade;
  let flags: {
    isSubjectModelEnabled: jest.Mock;
    isTier2InstanceSubjectEnabled: jest.Mock;
    isTier3WorkflowSubjectEnabled: jest.Mock;
    isTier1ScheduledTaskEnabled: jest.Mock;
  };

  const instantiation = {
    instantiateProcessIn: jest.fn().mockResolvedValue(42),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    flags = {
      isSubjectModelEnabled: jest.fn().mockReturnValue(true),
      isTier2InstanceSubjectEnabled: jest.fn().mockReturnValue(true),
      isTier3WorkflowSubjectEnabled: jest.fn().mockReturnValue(true),
      isTier1ScheduledTaskEnabled: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessLifecycleFacade,
        ProjectHostAdapter,
        ScheduledTaskHostAdapter,
        ConfigurableInstanceHostAdapter,
        GenericWorkflowHostAdapter,
        ProcessCompletionService,
        {
          provide: ConfigObjectStepExecutor,
          useValue: { areMandatoryBindingsValid: jest.fn().mockResolvedValue(true) },
        },
        ProcessHostRegistry,
        { provide: ProcessInstantiationService, useValue: instantiation },
        { provide: ProcessFeatureFlagsService, useValue: flags },
        { provide: EventsService, useValue: { emit: jest.fn() } },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn() },
        },
        {
          provide: getRepositoryToken(ConfigCustomObjectInstanceEntity),
          useValue: { findOne: jest.fn().mockResolvedValue({ status: 'DRAFT' }) },
        },
      ],
    }).compile();

    facade = module.get(ProcessLifecycleFacade);
  });

  it('startProcessForProject seeds mappings and one task per process step', async () => {
    const em = createRecordingEntityManager([
      { step_instance_id: 101, name: 'Step A', status: 'ready', step_order: 1 },
      { step_instance_id: 102, name: 'Step B', status: 'pending', step_order: 2 },
      { step_instance_id: 103, name: 'Step C', status: 'pending', step_order: 3 },
    ]);

    const result = await facade.startProcessForProject({
      tenantId: 1,
      createdBy: 2,
      templateId: 9,
      projectId: 10,
      statusIdByName: {
        'To Do': 1,
        Ready: 2,
        'In Progress': 3,
        Blocked: 4,
        Done: 5,
      },
      entityManager: em,
    });

    expect(result.processInstanceId).toBe(42);
    expect(result.firstStepInstanceId).toBe(101);

    expect(instantiation.instantiateProcessIn).toHaveBeenCalledWith(
      em,
      9,
      1,
      2,
      expect.objectContaining({
        subject: expect.objectContaining({
          subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
          subjectId: 10,
        }),
      }),
    );

    const mappingInserts = em.recorded.filter((q) =>
      q.sql.includes('INSERT IGNORE INTO project_step_status_mappings'),
    );
    expect(mappingInserts).toHaveLength(6);

    const taskInserts = em.recorded.filter((q) =>
      q.sql.includes('INSERT INTO tasks'),
    );
    expect(taskInserts).toHaveLength(1);
    expect(taskInserts[0].params).toHaveLength(3 * 20);
  });

  it('startWorkflowProcess uses workflow subject (self-subject id via instantiation)', async () => {
    const em = createRecordingEntityManager([]);

    const result = await facade.startWorkflowProcess({
      tenantId: 1,
      createdBy: 2,
      templateId: 7,
      context: { intent: 'profile_completion' },
      entityManager: em,
    });

    expect(result.processInstanceId).toBe(42);
    expect(instantiation.instantiateProcessIn).toHaveBeenCalledWith(
      em,
      7,
      1,
      2,
      expect.objectContaining({
        subject: expect.objectContaining({
          subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
          subjectId: 0,
        }),
        context: { intent: 'profile_completion' },
      }),
    );

    const taskSql = em.recorded.map((q) => q.sql).join(' ');
    expect(taskSql).not.toMatch(/INSERT INTO tasks/i);
  });

  it('rejects Tier 3 workflow when feature flag is off', async () => {
    flags.isTier3WorkflowSubjectEnabled.mockReturnValue(false);
    const em = createRecordingEntityManager([]);

    await expect(
      facade.startWorkflowProcess({
        tenantId: 1,
        createdBy: 2,
        templateId: 7,
        entityManager: em,
      }),
    ).rejects.toThrow(RpcException);
  });
});
