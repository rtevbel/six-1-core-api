import { RpcException } from '@nestjs/microservices';
import { PlannerPhaseDockService } from './planner-phase-dock.service';

describe('PlannerPhaseDockService (Week 11)', () => {
  const tenantUsers = {
    assertTenantAccess: jest.fn().mockResolvedValue({ tenantId: 20 }),
  };

  function buildService() {
    const scenario = {
      scheduleScenarioId: 12,
      schedulingRequirementId: 5,
      tenantId: 20,
      revision: 3,
      status: 'draft',
      processRuns: [
        {
          id: 'run-1',
          action: 'capacity_check',
          label: 'Capacity check',
          taskId: 501,
          projectId: 44,
          at: '2026-11-22T10:00:00.000Z',
          actorId: 1,
          status: 'ok',
        },
      ],
    };

    const scenarioRepo = {
      findOne: jest.fn().mockResolvedValue({ ...scenario }),
      save: jest.fn().mockImplementation(async (row: unknown) => row),
    };
    const plannedTaskRepo = {
      find: jest.fn().mockResolvedValue([
        {
          taskId: 501,
          planningPhase: 'execute',
          plannedStartUtc: new Date('2026-11-22T08:00:00.000Z'),
          plannedEndUtc: new Date('2026-11-22T16:00:00.000Z'),
        },
        {
          taskId: 502,
          planningPhase: 'plan',
          plannedStartUtc: new Date('2026-11-23T08:00:00.000Z'),
          plannedEndUtc: new Date('2026-11-23T12:00:00.000Z'),
        },
      ]),
      save: jest.fn().mockImplementation(async (row: Record<string, unknown>) => ({
        ...row,
        scenarioPlannedTaskId: 99,
      })),
      create: jest.fn((row: unknown) => row),
    };
    const shiftRepo = {
      save: jest.fn(),
      create: jest.fn((row: unknown) => row),
    };
    const taskRepo = {
      find: jest.fn().mockResolvedValue([
        { taskId: 501, name: 'Install', projectId: 44, tenantId: 20 },
        { taskId: 502, name: 'Survey', projectId: 44, tenantId: 20 },
      ]),
      findOne: jest.fn().mockResolvedValue({
        taskId: 501,
        projectId: 44,
        taskStatusId: 1,
      }),
      save: jest.fn().mockImplementation(async (row: Record<string, unknown>) => ({
        ...row,
        taskId: 8801,
      })),
      create: jest.fn((row: unknown) => row),
    };
    const requirements = {
      findOneOrFail: jest.fn().mockResolvedValue({
        schedulingRequirementId: 5,
        tenantId: 20,
        status: 'open',
      }),
      resolveScopedTaskIds: jest.fn().mockResolvedValue([501, 502]),
    };
    const audit = { appendEvent: jest.fn().mockResolvedValue(undefined) };
    const events = { emit: jest.fn() };

    const service = new PlannerPhaseDockService(
      tenantUsers as any,
      requirements as any,
      audit as any,
      events as any,
      scenarioRepo as any,
      plannedTaskRepo as any,
      shiftRepo as any,
      taskRepo as any,
    );

    return { service, scenarioRepo, taskRepo, events, audit, requirements };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    tenantUsers.assertTenantAccess.mockResolvedValue({ tenantId: 20 });
  });

  it('returns phase counts, templates, and tasksByPhase', async () => {
    const { service } = buildService();
    const view = await service.getPhaseDock(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
    });
    expect(view.phases.find((p) => p.id === 'execute')?.taskCount).toBe(1);
    expect(view.phases.find((p) => p.id === 'plan')?.taskCount).toBe(1);
    expect(view.templates.length).toBeGreaterThan(0);
    expect(view.tasksByPhase.execute[0].taskId).toBe(501);
    expect(view.revision).toBe(3);
  });

  it('does not count unplanned scoped masters toward phase totals', async () => {
    const { service, taskRepo, requirements } = buildService();
    // Extra scoped master with no scenario_planned_tasks row must not inflate `plan`.
    taskRepo.find.mockResolvedValue([
      { taskId: 501, name: 'Install', projectId: 44, tenantId: 20 },
      { taskId: 502, name: 'Survey', projectId: 44, tenantId: 20 },
      { taskId: 999, name: 'Unplanned', projectId: 44, tenantId: 20 },
    ]);
    requirements.resolveScopedTaskIds.mockResolvedValue([501, 502, 999]);

    const view = await service.getPhaseDock(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
    });
    expect(view.phases.find((p) => p.id === 'plan')?.taskCount).toBe(1);
    expect(view.phases.find((p) => p.id === 'execute')?.taskCount).toBe(1);
    expect(
      Object.values(view.tasksByPhase).flat().map((t) => t.taskId),
    ).not.toContain(999);
  });

  it('applies a dock template and bumps revision', async () => {
    const { service, taskRepo, events } = buildService();
    const view = await service.applyDockTemplate(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      templateId: 'tpl-commissioning',
      projectId: 44,
      plannedStartUtc: '2026-11-24T08:00:00.000Z',
      expectedRevision: 3,
    });
    expect(taskRepo.save).toHaveBeenCalled();
    expect(view.taskId).toBe(8801);
    expect(view.planningPhase).toBe('execute');
    expect(view.revision).toBe(4);
    expect(events.emit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cause: 'task_upsert' }),
    );
  });

  it('lists and appends process runs', async () => {
    const { service, scenarioRepo, events } = buildService();
    const listed = await service.listProcessRuns(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
    });
    expect(listed.items).toHaveLength(1);

    const filtered = await service.listProcessRuns(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      taskId: 999,
    });
    expect(filtered.items).toHaveLength(0);

    const forTask = await service.listProcessRuns(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      taskId: 501,
    });
    expect(forTask.items).toHaveLength(1);

    const appended = await service.appendProcessRun(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      action: 'dispatch_start',
      label: 'Dispatch starten',
      taskId: 501,
      expectedRevision: 3,
    });
    expect(appended.run.action).toBe('dispatch_start');
    expect(appended.revision).toBe(4);
    expect(scenarioRepo.save).toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cause: 'process_run' }),
    );
  });

  it('rejects tenant mismatch on phase dock', async () => {
    tenantUsers.assertTenantAccess.mockRejectedValue(
      new RpcException({
        statusCode: 403,
        message: 'Tenant scope mismatch',
      }),
    );
    const { service } = buildService();
    await expect(
      service.getPhaseDock(1, { tenantId: 99, scheduleScenarioId: 12 }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
