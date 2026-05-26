import { DataSource, EntityManager } from 'typeorm';
import { ProcessCompletionService } from './process-completion.service';
import { ConfigObjectStepExecutor } from './config-object-step-executor.service';

describe('ProcessCompletionService', () => {
  const query = jest.fn();
  const em = { query } as unknown as EntityManager;
  const ds = {
    transaction: jest.fn(async (_iso, fn) => fn(em)),
  } as unknown as DataSource;

  const configObjectExecutor = {
    areMandatoryBindingsValid: jest.fn().mockResolvedValue(true),
  } as unknown as ConfigObjectStepExecutor;

  let service: ProcessCompletionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProcessCompletionService(ds, configObjectExecutor);
  });

  it('returns false when mandatory steps are not terminal', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SUM(status IN')) {
        return [{ total: 2, terminal: 1 }];
      }
      if (sql.includes('parent_instance_id')) {
        return [{ cnt: 0 }];
      }
      if (sql.includes('SELECT step_instance_id')) {
        return [{ step_instance_id: 1 }, { step_instance_id: 2 }];
      }
      return [];
    });

    const result = await service.evaluate(99);
    expect(result.canComplete).toBe(false);
    expect(result.reasons).toContain('mandatory_steps_not_terminal');
  });

  it('returns false when a child process is still active', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SUM(status IN')) {
        return [{ total: 1, terminal: 1 }];
      }
      if (sql.includes('parent_instance_id')) {
        return [{ cnt: 1 }];
      }
      if (sql.includes('SELECT step_instance_id')) {
        return [{ step_instance_id: 1 }];
      }
      return [];
    });

    const result = await service.evaluate(99);
    expect(result.canComplete).toBe(false);
    expect(result.reasons).toContain('active_child_process');
  });

  it('returns true when steps, children, and bindings are satisfied', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SUM(status IN')) {
        return [{ total: 2, terminal: 2 }];
      }
      if (sql.includes('parent_instance_id')) {
        return [{ cnt: 0 }];
      }
      if (sql.includes('SELECT step_instance_id')) {
        return [{ step_instance_id: 10 }, { step_instance_id: 11 }];
      }
      return [];
    });

    const result = await service.evaluate(99);
    expect(result.canComplete).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(configObjectExecutor.areMandatoryBindingsValid).toHaveBeenCalledTimes(
      2,
    );
  });
});
