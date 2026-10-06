import { RpcException } from '@nestjs/microservices';
import { PlannerMutateService } from './planner-mutate.service';
import { ConstraintConflictCode } from '../constraints/constraint.codes';

describe('PlannerMutateService Epic D Week 5', () => {
  const tenantUsers = {
    assertTenantAccess: jest.fn().mockResolvedValue({ tenantId: 20 }),
  };

  const requirement = {
    schedulingRequirementId: 5,
    tenantId: 20,
    status: 'open',
    horizonStartUtc: new Date('2026-10-01T00:00:00.000Z'),
    horizonEndUtc: new Date('2026-10-31T23:59:59.000Z'),
  };

  function buildService(overrides: {
    upsertResult?: unknown;
    removeResult?: unknown;
    plannedTasks?: unknown[];
    validateResults?: Array<{ hard: unknown[]; soft: unknown[] }>;
  } = {}) {
    const planning = {
      upsertPlannedTask: jest.fn().mockResolvedValue(
        overrides.upsertResult ?? {
          revision: 5,
          conflicts: [],
          plannedTask: {
            scenarioPlannedTaskId: 9,
            taskId: 101,
            plannedStartUtc: new Date('2026-10-08T08:00:00.000Z'),
            plannedEndUtc: new Date('2026-10-08T12:00:00.000Z'),
            tzUsed: 'UTC',
            planningKind: 'task',
            deadlineUtc: null,
            notes: 'Cable pull',
            isPlanned: true,
            isReady: false,
            isMilestone: false,
            priority: 0,
            taskStatusId: null,
            shifts: [
              {
                sequenceNo: 1,
                tenantUserId: 55,
                resourceId: null,
                plannedStartUtc: new Date('2026-10-08T08:00:00.000Z'),
                plannedEndUtc: new Date('2026-10-08T12:00:00.000Z'),
              },
            ],
            assignments: [],
          },
        },
      ),
      removePlannedTask: jest.fn().mockResolvedValue(
        overrides.removeResult ?? { removed: true, revision: 6 },
      ),
      findPlannedTasks: jest.fn().mockResolvedValue(
        overrides.plannedTasks ?? [
          {
            taskId: 101,
            plannedStartUtc: new Date('2026-10-08T08:00:00.000Z'),
            plannedEndUtc: new Date('2026-10-08T12:00:00.000Z'),
            shifts: [
              {
                sequenceNo: 1,
                tenantUserId: 55,
                resourceId: null,
                plannedStartUtc: new Date('2026-10-08T08:00:00.000Z'),
                plannedEndUtc: new Date('2026-10-08T12:00:00.000Z'),
              },
            ],
            assignments: [],
          },
        ],
      ),
    };

    const scenarios = {
      findOne: jest.fn().mockResolvedValue({
        scheduleScenarioId: 12,
        schedulingRequirementId: 5,
        revision: 4,
        status: 'draft',
      }),
    };

    const requirements = {
      findOneOrFail: jest.fn().mockResolvedValue(requirement),
      resolveScopedTaskIds: jest.fn().mockResolvedValue([101]),
    };

    let validateCall = 0;
    const constraints = {
      validatePlacement: jest.fn().mockImplementation(async () => {
        const canned = overrides.validateResults?.[validateCall++];
        return canned ?? { ok: true, hard: [], soft: [] };
      }),
    };

    const taskRepo = {
      findOne: jest.fn().mockResolvedValue({
        taskId: 101,
        tenantId: 20,
        estimatedDuration: 240,
        primaryAssigneeId: 55,
      }),
      find: jest.fn().mockResolvedValue([
        { taskId: 101, tenantId: 20, primaryAssigneeId: 55 },
      ]),
    };

    const service = new PlannerMutateService(
      tenantUsers as any,
      requirements as any,
      scenarios as any,
      planning as any,
      constraints as any,
      taskRepo as any,
    );

    return {
      service,
      planning,
      scenarios,
      requirements,
      constraints,
      taskRepo,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    tenantUsers.assertTenantAccess.mockResolvedValue({ tenantId: 20 });
  });

  it('upserts sheet fields and returns DTO + revision', async () => {
    const { service, planning } = buildService();

    const result = await service.upsertTask(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      taskId: 101,
      plannedStartUtc: '2026-10-08T08:00:00.000Z',
      plannedEndUtc: '2026-10-08T12:00:00.000Z',
      tenantUserId: 55,
      planningKind: 'task',
      notes: 'Cable pull',
      expectedRevision: 4,
    });

    expect(planning.upsertPlannedTask).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        taskId: 101,
        expectedRevision: 4,
        planningKind: 'task',
        shifts: [
          expect.objectContaining({
            sequenceNo: 1,
            tenantUserId: 55,
          }),
        ],
      }),
    );
    expect(result.revision).toBe(5);
    expect(result.plannedTask.tenantUserId).toBe(55);
    expect(result.plannedTask.notes).toBe('Cable pull');
    expect(result.conflictSummary).toEqual({ hard: 0, soft: 0 });
    expect(result).not.toHaveProperty('shifts');
  });

  it('remove returns new revision', async () => {
    const { service, planning } = buildService();
    const result = await service.removeTask(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      taskId: 101,
      expectedRevision: 5,
    });
    expect(planning.removePlannedTask).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ expectedRevision: 5 }),
    );
    expect(result).toEqual({
      removed: true,
      revision: 6,
      scheduleScenarioId: 12,
      taskId: 101,
    });
  });

  it('assess returns conflicts without calling upsert', async () => {
    const { service, planning, constraints } = buildService({
      validateResults: [
        { hard: [], soft: [] },
        {
          hard: [
            {
              code: ConstraintConflictCode.USER_OVERLAP,
              severity: 'hard',
              message: 'overlap',
            },
          ],
          soft: [],
        },
      ],
    });

    const result = await service.assess(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      taskId: 101,
      plannedStartUtc: '2026-10-08T08:00:00.000Z',
      plannedEndUtc: '2026-10-08T12:00:00.000Z',
      tenantUserId: 55,
    });

    expect(planning.upsertPlannedTask).not.toHaveBeenCalled();
    expect(constraints.validatePlacement).toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.conflictSummary.hard).toBe(1);
    expect(result.conflicts[0].code).toBe(ConstraintConflictCode.USER_OVERLAP);
  });

  it('assess marks unassigned as soft when no assignee', async () => {
    const { service } = buildService({
      validateResults: [{ hard: [], soft: [] }],
    });

    const result = await service.assess(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      taskId: 101,
      plannedStartUtc: '2026-10-08T08:00:00.000Z',
      plannedEndUtc: '2026-10-08T12:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    expect(result.conflicts.some((c) => c.code === ConstraintConflictCode.UNASSIGNED)).toBe(
      true,
    );
  });

  it('suggest returns ranked slots within search window', async () => {
    const { service, constraints } = buildService();

    const result = await service.suggest(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      taskId: 101,
      durationMs: 4 * 60 * 60 * 1000,
      searchStartUtc: '2026-10-06T00:00:00.000Z',
      searchDays: 2,
      limit: 5,
    });

    expect(constraints.validatePlacement).toHaveBeenCalled();
    expect(result.slots.length).toBeGreaterThan(0);
    expect(result.slots.length).toBeLessThanOrEqual(5);
    expect(result.slots[0].hardCount).toBe(0);
    expect(result.slots[0].startUtc).toMatch(/^2026-10-/);
  });

  it('propagates tenant forbidden from assertTenantAccess', async () => {
    tenantUsers.assertTenantAccess.mockRejectedValue(
      new RpcException({
        statusCode: 403,
        message: 'Tenant scope mismatch',
      }),
    );
    const { service } = buildService();

    await expect(
      service.assess(1, {
        tenantId: 99,
        scheduleScenarioId: 12,
        taskId: 101,
        plannedStartUtc: '2026-10-08T08:00:00.000Z',
        plannedEndUtc: '2026-10-08T12:00:00.000Z',
        tenantUserId: 55,
      }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it('upsert propagates version_conflict from planning layer', async () => {
    const { service, planning } = buildService();
    planning.upsertPlannedTask.mockRejectedValue(
      new RpcException({
        statusCode: 409,
        message: 'Scenario revision conflict; reload and retry',
        errorCode: 'version_conflict',
      }),
    );

    await expect(
      service.upsertTask(1, {
        tenantId: 20,
        scheduleScenarioId: 12,
        taskId: 101,
        plannedStartUtc: '2026-10-08T08:00:00.000Z',
        plannedEndUtc: '2026-10-08T12:00:00.000Z',
        expectedRevision: 1,
      }),
    ).rejects.toBeInstanceOf(RpcException);

    try {
      await service.upsertTask(1, {
        tenantId: 20,
        scheduleScenarioId: 12,
        taskId: 101,
        plannedStartUtc: '2026-10-08T08:00:00.000Z',
        plannedEndUtc: '2026-10-08T12:00:00.000Z',
        expectedRevision: 1,
      });
    } catch (e) {
      expect((e as RpcException).getError()).toMatchObject({
        statusCode: 409,
        errorCode: 'version_conflict',
      });
    }
  });
});
