import { RpcException } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { ProcessInstantiationService } from './process-instantiation.service';
import { PROCESS_SUBJECT_TYPE_PROJECT } from './process-subject.constants';
import { PROCESS_TEMPLATE_NOT_PUBLISHED_MESSAGE } from '../common/constants';

describe('ProcessInstantiationService', () => {
  const query = jest.fn();
  const em = { query };
  const ds = {
    transaction: jest.fn(async (_iso, fn) => fn(em)),
  } as unknown as DataSource;

  let service: ProcessInstantiationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProcessInstantiationService(ds);

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
            name: 'Step 1',
          },
          {
            process_template_step_id: 2,
            step_order: 2,
            task_type: 'manual',
            is_optional: 0,
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

      if (
        normalized.includes('INSERT INTO process_instance_step_object_instances')
      ) {
        return { affectedRows: 2 };
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
