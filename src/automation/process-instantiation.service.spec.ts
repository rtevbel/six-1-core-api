import { RpcException } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { ProcessInstantiationService } from './process-instantiation.service';
import { PROCESS_SUBJECT_TYPE_PROJECT } from './process-subject.constants';
import { PROCESS_TEMPLATE_NOT_PUBLISHED_MESSAGE } from '../common/constants';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import { ProcessStepAssigneeService } from './process-step-assignee.service';

describe('ProcessInstantiationService', () => {
  const query = jest.fn();
  const em = { query };
  const ds = {
    transaction: jest.fn(async (_iso, fn) => fn(em)),
  } as unknown as DataSource;
  const processFlags = {
    isStepAssigneeSpecEnabled: jest.fn().mockReturnValue(false),
  };
  const stepAssignees = {
    resolveAndPersistForStep: jest.fn().mockResolvedValue({
      assigneeIds: [],
      primaryAssigneeId: null,
    }),
  };

  let service: ProcessInstantiationService;

  beforeEach(() => {
    jest.clearAllMocks();
    processFlags.isStepAssigneeSpecEnabled.mockReturnValue(false);
    service = new ProcessInstantiationService(
      ds,
      processFlags as unknown as ProcessFeatureFlagsService,
      stepAssignees as unknown as ProcessStepAssigneeService,
    );

    query.mockImplementation(async (sql: string) => {
      const normalized = sql.replace(/\s+/g, ' ').trim();

      if (
        normalized.includes('FROM process_templates') &&
        normalized.includes('SELECT status')
      ) {
        return [{ status: 'PUBLISHED' }];
      }

      if (normalized.startsWith('INSERT INTO process_instances')) {
        return { insertId: 500 };
      }

      if (
        normalized.includes('FROM process_template_steps') &&
        normalized.includes('ORDER BY pts.step_order')
      ) {
        return [
          {
            process_template_step_id: 1,
            step_order: 1,
            task_type: 'manual',
            is_optional: 0,
            required_permissions: ['process_templates.manage'],
            step_extensions_json: {
              visibleWhen: { '==': [{ var: 'context.customerType' }, 'B2B'] },
              allowSkip: true,
            },
            assignee_spec: null,
            name: 'Step 1',
          },
          {
            process_template_step_id: 2,
            step_order: 2,
            task_type: 'manual',
            is_optional: 0,
            required_permissions: null,
            step_extensions_json: null,
            assignee_spec: null,
            name: 'Step 2',
          },
        ];
      }

      if (normalized.startsWith('INSERT INTO process_instance_steps')) {
        return { insertId: query.mock.calls.filter((c) =>
          String(c[0]).includes('INSERT INTO process_instance_steps'),
        ).length + 1000 };
      }

      if (normalized.includes('FROM process_template_step_requirements')) {
        return [];
      }

      if (normalized.includes('FROM process_template_step_trigger_conditions')) {
        return [];
      }

      if (normalized.includes('FROM process_template_step_object_bindings')) {
        return [
          {
            binding_id: 11,
            process_template_step_id: 1,
            config_object_id: 99,
          },
          {
            binding_id: 12,
            process_template_step_id: 2,
            config_object_id: 100,
          },
        ];
      }

      if (normalized.includes('FROM process_template_step_actions')) {
        return [
          {
            step_action_id: 21,
            process_template_step_id: 1,
            action_type: 'emit_event',
            run_on: 'step_completed',
            config: { eventName: 'six1-event.process_step_completed' },
            order_index: 0,
            is_active: 1,
          },
          {
            step_action_id: 22,
            process_template_step_id: 2,
            action_type: 'update_sor_field',
            run_on: 'process_completed',
            config: {
              objectType: 'customer',
              coreIdPath: 'context.customerId',
              corePatch: { status: 'active' },
            },
            order_index: 1,
            is_active: 1,
          },
        ];
      }

      if (normalized.includes('FROM process_template_step_assignees')) {
        return [
          {
            process_template_step_id: 1,
            tenant_user_id: 42,
            assignment_order: 0,
          },
        ];
      }

      if (
        normalized.includes('INSERT INTO process_instance_step_object_instances')
      ) {
        return { affectedRows: 2 };
      }

      if (normalized.includes('INSERT INTO process_instance_step_actions')) {
        return { affectedRows: 2 };
      }

      if (normalized.includes('INSERT INTO process_instance_step_assignees')) {
        return { affectedRows: 1 };
      }

      return [];
    });
  });

  it('rejects instantiation when template is not PUBLISHED', async () => {
    query.mockImplementation(async (sql: string) => {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      if (
        normalized.includes('FROM process_templates') &&
        normalized.includes('SELECT status')
      ) {
        return [{ status: 'ARCHIVED' }];
      }
      return [];
    });

    await expect(
      service.instantiateProcess(7, 1, 2, {
        subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
        subjectId: 10,
      }),
    ).rejects.toMatchObject({
      message: PROCESS_TEMPLATE_NOT_PUBLISHED_MESSAGE,
    });
  });

  it('copies template object bindings to instance rows with pending status', async () => {
    const processInstanceId = await service.instantiateProcess(
      7,
      1,
      2,
      {
        subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
        subjectId: 10,
      },
    );

    expect(processInstanceId).toBe(500);

    const objectInstanceInsert = query.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO process_instance_step_object_instances'),
    );

    expect(objectInstanceInsert).toBeDefined();
    expect(objectInstanceInsert?.[0]).toContain('"pending"');
    expect(objectInstanceInsert?.[1]).toEqual(
      expect.arrayContaining([
        1001,
        11,
        99,
        null,
        1002,
        12,
        100,
        null,
      ]),
    );
  });

  it('copies template required_permissions onto instance steps', async () => {
    await service.instantiateProcess(7, 1, 2, {
      subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
      subjectId: 10,
    });

    const stepInserts = query.mock.calls.filter(([sql]) =>
      String(sql).includes('INSERT INTO process_instance_steps'),
    );

    expect(stepInserts).toHaveLength(2);
    expect(stepInserts[0]?.[1]).toEqual(
      expect.arrayContaining([
        500,
        1,
        'Step 1',
        'manual',
        1,
        0,
        JSON.stringify(['process_templates.manage']),
        JSON.stringify({
          visibleWhen: { '==': [{ var: 'context.customerType' }, 'B2B'] },
          allowSkip: true,
        }),
        null,
        null,
        'ready',
      ]),
    );
    expect(stepInserts[1]?.[1]).toEqual(
      expect.arrayContaining([
        500,
        2,
        'Step 2',
        'manual',
        2,
        0,
        null,
        null,
        null,
        null,
        'pending',
      ]),
    );
  });

  it('copies template step_extensions_json onto instance steps', async () => {
    await service.instantiateProcess(7, 1, 2, {
      subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
      subjectId: 10,
    });

    const stepInserts = query.mock.calls.filter(([sql]) =>
      String(sql).includes('INSERT INTO process_instance_steps'),
    );

    expect(stepInserts[0]?.[0]).toContain('step_extensions_json');
    expect(stepInserts[0]?.[1]?.[7]).toBe(
      JSON.stringify({
        visibleWhen: { '==': [{ var: 'context.customerType' }, 'B2B'] },
        allowSkip: true,
      }),
    );
    expect(stepInserts[0]?.[1]?.[8]).toBeNull();
    expect(stepInserts[1]?.[1]?.[7]).toBeNull();
  });

  it('copies template step assignees onto instance steps', async () => {
    await service.instantiateProcess(7, 1, 2, {
      subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
      subjectId: 10,
    });

    const assigneeInsert = query.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO process_instance_step_assignees'),
    );

    expect(assigneeInsert).toBeDefined();
    expect(assigneeInsert?.[1]).toEqual([1001, 42, 0]);
  });

  it('copies template step actions to instance rows with config snapshot', async () => {
    const processInstanceId = await service.instantiateProcess(7, 1, 2, {
      subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
      subjectId: 10,
    });

    expect(processInstanceId).toBe(500);

    const actionInsert = query.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO process_instance_step_actions'),
    );

    expect(actionInsert).toBeDefined();
    expect(actionInsert?.[1]).toEqual([
      1001,
      21,
      'emit_event',
      'step_completed',
      JSON.stringify({ eventName: 'six1-event.process_step_completed' }),
      0,
      1,
      1002,
      22,
      'update_sor_field',
      'process_completed',
      JSON.stringify({
        objectType: 'customer',
        coreIdPath: 'context.customerId',
        corePatch: { status: 'active' },
      }),
      1,
      1,
    ]);
  });

  it('instantiates a 50-step template in one transaction with retry wrapper', async () => {
    const templateSteps = Array.from({ length: 50 }, (_, i) => ({
      process_template_step_id: i + 1,
      step_order: i + 1,
      task_type: 'manual',
      is_optional: 0,
      name: `Step ${i + 1}`,
    }));

    let stepInsertCount = 0;
    query.mockImplementation(async (sql: string) => {
      const normalized = sql.replace(/\s+/g, ' ').trim();

      if (normalized.startsWith('INSERT INTO process_instances')) {
        return { insertId: 900 };
      }

      if (
        normalized.includes('FROM process_template_steps') &&
        normalized.includes('ORDER BY pts.step_order')
      ) {
        return templateSteps;
      }

      if (normalized.startsWith('INSERT INTO process_instance_steps')) {
        stepInsertCount += 1;
        return { insertId: 2000 + stepInsertCount };
      }

      if (normalized.includes('FROM process_template_step_requirements')) {
        return [];
      }

      if (normalized.includes('FROM process_template_step_trigger_conditions')) {
        return [];
      }

      if (normalized.includes('FROM process_template_step_object_bindings')) {
        return [];
      }

      if (normalized.includes('FROM process_template_step_actions')) {
        return [];
      }

      return [];
    });

    const id = await service.instantiateProcess(1, 1, 1, {
      subjectType: PROCESS_SUBJECT_TYPE_PROJECT,
      subjectId: 5,
    });

    expect(id).toBe(900);
    expect(stepInsertCount).toBe(50);
    expect(ds.transaction).toHaveBeenCalledWith(
      'READ COMMITTED',
      expect.any(Function),
    );
  });

  it('retries instantiation on deadlock (1213)', async () => {
    let attempts = 0;
    (ds.transaction as jest.Mock).mockImplementation(async (_iso, fn) => {
      attempts += 1;
      if (attempts === 1) {
        const err = new Error('deadlock');
        (err as Error & { errno: number }).errno = 1213;
        throw err;
      }
      return fn(em);
    });

    query.mockImplementation(async (sql: string) => {
      if (String(sql).includes('INSERT INTO process_instances')) {
        return { insertId: 1 };
      }
      if (String(sql).includes('FROM process_template_steps')) {
        return [
          {
            process_template_step_id: 1,
            step_order: 1,
            task_type: 'manual',
            is_optional: 0,
            name: 'S1',
          },
        ];
      }
      if (String(sql).includes('INSERT INTO process_instance_steps')) {
        return { insertId: 2 };
      }
      return [];
    });

    const id = await service.instantiateProcess(1, 1, 1);
    expect(id).toBe(1);
    expect(attempts).toBe(2);
  });
});
