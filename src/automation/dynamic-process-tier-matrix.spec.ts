/**
 * Phase 9 — tier matrix (message-handler contract level, no live DB).
 */
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
import { ProcessCompletionService } from './process-completion.service';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import { ConfigObjectStepExecutor } from './config-object-step-executor.service';
import { EventsService } from '../events/events.service';
import { ConfigCustomObjectInstanceEntity } from '../config_objects/entities/config_custom_object_instance.entity';
import {
  PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE,
  PROCESS_SUBJECT_TYPE_PROJECT,
  PROCESS_SUBJECT_TYPE_SCHEDULED_TASK,
  PROCESS_SUBJECT_TYPE_WORKFLOW,
} from './process-subject.constants';

type Scenario = {
  name: string;
  tier: 1 | 2 | 3;
  subjectType: string;
  run: (facade: ProcessLifecycleFacade, em: EntityManager) => Promise<void>;
  expectTasks: boolean;
};

function recordingEm() {
  const recorded: Array<{ sql: string }> = [];
  const em = {
    recorded,
    query: jest.fn(async (sql: string) => {
      recorded.push({ sql });
      const n = sql.replace(/\s+/g, ' ').trim();
      if (n.includes('FROM process_instance_steps') && n.includes('ORDER BY')) {
        return [{ step_instance_id: 501, name: 'S1', status: 'pending' }];
      }
      if (n.includes('SELECT step_instance_id') && n.includes('LIMIT 1')) {
        return [{ step_instance_id: 501 }];
      }
      if (n.includes('UPDATE process_instances') && n.includes('subject_id')) {
        return { affectedRows: 1 };
      }
      if (n.includes('FROM config_custom_object_instances')) {
        return [{ status: 'DRAFT' }];
      }
      if (n.includes('UPDATE scheduled_tasks')) {
        return { affectedRows: 1 };
      }
      if (n.includes('FROM project_step_status_mappings')) {
        return [{ step_engine_state: 'pending', task_status_id: 1 }];
      }
      return [];
    }),
  } as unknown as EntityManager & { recorded: Array<{ sql: string }> };
  return em;
}

function recordingEmForProject() {
  const recorded: Array<{ sql: string }> = [];
  const em = {
    recorded,
    query: jest.fn(async (sql: string) => {
      recorded.push({ sql });
      const n = sql.replace(/\s+/g, ' ').trim();
      if (n.includes('FROM process_instance_steps') && n.includes('ORDER BY')) {
        return [
          { step_instance_id: 101, name: 'A', status: 'ready', step_order: 1, task_type: 'manual' },
          { step_instance_id: 102, name: 'B', status: 'pending', step_order: 2, task_type: 'manual' },
        ];
      }
      if (n.includes('SELECT step_instance_id') && n.includes('LIMIT 1')) {
        return [{ step_instance_id: 101 }];
      }
      if (n.includes('FROM project_step_status_mappings')) {
        return [
          { step_engine_state: 'pending', task_status_id: 1 },
          { step_engine_state: 'ready', task_status_id: 2 },
        ];
      }
      if (n.includes('INSERT IGNORE INTO project_step_status_mappings')) {
        return { affectedRows: 2 };
      }
      if (n.includes('INSERT INTO tasks')) {
        return { insertId: 1 };
      }
      return [];
    }),
  } as unknown as EntityManager & { recorded: Array<{ sql: string }> };
  return em;
}

describe('Dynamic process tier matrix (Phase 9)', () => {
  const instantiation = {
    instantiateProcessIn: jest.fn().mockResolvedValue(42),
  };

  const flags = {
    isSubjectModelEnabled: jest.fn().mockReturnValue(true),
    isTier2InstanceSubjectEnabled: jest.fn().mockReturnValue(true),
    isTier3WorkflowSubjectEnabled: jest.fn().mockReturnValue(true),
    isTier1ScheduledTaskEnabled: jest.fn().mockReturnValue(true),
  };

  let facade: ProcessLifecycleFacade;

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
          provide: ProcessInstantiationService,
          useValue: instantiation,
        },
        {
          provide: ConfigObjectStepExecutor,
          useValue: { areMandatoryBindingsValid: jest.fn().mockResolvedValue(true) },
        },
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

  const scenarios: Scenario[] = [
    {
      name: 'Project + template + tasks',
      tier: 1,
      subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
      expectTasks: true,
      run: async (f, em) => {
        const projectEm = recordingEmForProject();
        await f.startProcessForProject({
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
          entityManager: projectEm,
        });
        Object.assign(em, { recorded: projectEm.recorded });
      },
    },
    {
      name: 'Scheduled task + process',
      tier: 1,
      subjectType: PROCESS_SUBJECT_TYPE_SCHEDULED_TASK,
      expectTasks: false,
      run: async (f, em) => {
        await f.startProcessForScheduledTask({
          tenantId: 1,
          createdBy: 2,
          templateId: 9,
          scheduledTaskId: 50,
          entityManager: em,
        });
      },
    },
    {
      name: 'Invoice approval (config instance)',
      tier: 2,
      subjectType: PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE,
      expectTasks: false,
      run: async (f, em) => {
        await f.startProcess({
          tenantId: 1,
          createdBy: 2,
          templateId: 8,
          subjectType: PROCESS_SUBJECT_TYPE_CONFIG_CUSTOM_OBJECT_INSTANCE,
          subjectId: 77,
          entityManager: em,
        });
      },
    },
    {
      name: 'Profile / workflow child anchor',
      tier: 3,
      subjectType: PROCESS_SUBJECT_TYPE_WORKFLOW,
      expectTasks: false,
      run: async (f, em) => {
        await f.startWorkflowProcess({
          tenantId: 1,
          createdBy: 2,
          templateId: 7,
          context: { profileCapture: true },
          entityManager: em,
        });
      },
    },
  ];

  it.each(scenarios)(
    '$name (tier $tier) uses subject_type=$subjectType',
    async ({ run, expectTasks, subjectType }) => {
      const em = recordingEm();
      await run(facade, em);

      const sql = em.recorded.map((r) => r.sql).join(' ');
      const emArg =
        instantiation.instantiateProcessIn.mock.calls.at(-1)?.[0] ?? em;
      expect(instantiation.instantiateProcessIn).toHaveBeenCalledWith(
        emArg,
        expect.any(Number),
        1,
        2,
        expect.objectContaining({
          subject: expect.objectContaining({ subjectType }),
        }),
      );

      if (expectTasks) {
        expect(sql).toMatch(/INSERT\s+INTO\s+tasks/i);
      } else {
        expect(sql).not.toMatch(/INSERT\s+INTO\s+tasks/i);
      }
    },
  );
});
