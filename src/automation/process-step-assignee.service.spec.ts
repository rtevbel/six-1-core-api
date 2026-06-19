import { ProcessStepAssigneeService } from './process-step-assignee.service';
import { ProcessStepAssigneeResolverService } from './process-step-assignee-resolver.service';
import { ProcessInstanceStepAssigneeEntity } from '../process_instances/process_instance_steps/entities/process_instance_step_assignee.entity';

describe('ProcessStepAssigneeService.resolveAndPersistForStep', () => {
  const assigneeResolver = {
    resolveTenantUserIds: jest.fn(),
  };

  const repo = {
    find: jest.fn(),
    create: jest.fn((row) => row),
    save: jest.fn(async (rows) => rows),
    manager: {
      query: jest.fn(),
      getRepository: jest.fn(),
    },
  };

  const service = new ProcessStepAssigneeService(
    repo as unknown as import('typeorm').Repository<ProcessInstanceStepAssigneeEntity>,
    assigneeResolver as unknown as ProcessStepAssigneeResolverService,
  );

  const em = {
    query: jest.fn(),
    getRepository: jest.fn(() => repo),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    em.query.mockImplementation(async (sql: string) => {
      if (sql.includes('DELETE FROM')) {
        return [];
      }
      return [
        {
          assignee_spec: { type: 'tenant_role', roleName: 'Manager' },
          process_instance_id: 1,
          tenant_id: 5,
          subject_type: 'workflow',
          subject_id: 1,
          subject_metadata: null,
          context: { managerId: 99 },
        },
      ];
    });
    assigneeResolver.resolveTenantUserIds.mockResolvedValue([701]);
  });

  it('clears assignees and persists resolved tenant user ids', async () => {
    const result = await service.resolveAndPersistForStep(
      { stepInstanceId: 200, tenantId: 5, actorTenantUserId: 10 },
      em as never,
    );

    expect(em.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM process_instance_step_assignees'),
      [200],
    );
    expect(assigneeResolver.resolveTenantUserIds).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith([
      expect.objectContaining({ stepInstanceId: 200, tenantUserId: 701 }),
    ]);
    expect(result).toEqual({ assigneeIds: [701], primaryAssigneeId: 701 });
  });

  it('returns empty when assignee_spec is null', async () => {
    em.query.mockImplementation(async (sql: string) => {
      if (sql.includes('DELETE FROM')) {
        return [];
      }
      return [
        {
          assignee_spec: null,
          process_instance_id: 1,
          tenant_id: 5,
          subject_type: 'workflow',
          subject_id: 1,
          subject_metadata: null,
          context: null,
        },
      ];
    });

    const result = await service.resolveAndPersistForStep(
      { stepInstanceId: 200, tenantId: 5 },
      em as never,
    );

    expect(assigneeResolver.resolveTenantUserIds).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(result).toEqual({ assigneeIds: [], primaryAssigneeId: null });
  });
});
