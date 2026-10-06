import { RpcException } from '@nestjs/microservices';
import { PlannerReadService } from './planner-read.service';
import { ConstraintConflictCode } from '../constraints/constraint.codes';

describe('PlannerReadService Epic D Week 4', () => {
  const tenantUsers = {
    assertTenantAccess: jest.fn().mockResolvedValue({ tenantId: 20 }),
  };

  const requirement = {
    schedulingRequirementId: 5,
    tenantId: 20,
    status: 'open',
    activeScenarioId: 12,
    definitiveScenarioId: null,
    horizonStartUtc: new Date('2026-09-01T00:00:00.000Z'),
    horizonEndUtc: new Date('2026-09-30T23:59:59.000Z'),
    scopeType: 'project',
    primaryProjectId: 100,
  };

  function buildService(overrides: {
    plannedTasks?: unknown[];
    conflicts?: unknown[];
    tasks?: unknown[];
    projects?: unknown[];
    deps?: unknown[];
  } = {}) {
    const requirements = {
      findOneOrFail: jest.fn().mockResolvedValue(requirement),
      resolveScopedTaskIds: jest.fn().mockResolvedValue([501, 502]),
    };
    const scenarios = {
      findOne: jest.fn().mockResolvedValue({
        scheduleScenarioId: 12,
        revision: 3,
        status: 'draft',
      }),
    };
    const planning = {
      findPlannedTasks: jest.fn().mockResolvedValue(
        overrides.plannedTasks ?? [
          {
            taskId: 501,
            isPlanned: true,
            isMilestone: false,
            plannedStartUtc: new Date('2026-09-08T07:00:00.000Z'),
            plannedEndUtc: new Date('2026-09-08T15:00:00.000Z'),
            baselineStartUtc: null,
            shifts: [
              {
                sequenceNo: 1,
                tenantUserId: 7,
                resourceId: null,
                plannedStartUtc: new Date('2026-09-08T07:00:00.000Z'),
                plannedEndUtc: new Date('2026-09-08T15:00:00.000Z'),
              },
            ],
            assignments: [],
          },
          {
            taskId: 502,
            isPlanned: true,
            isMilestone: false,
            plannedStartUtc: new Date('2026-09-09T07:00:00.000Z'),
            plannedEndUtc: new Date('2026-09-09T15:00:00.000Z'),
            baselineStartUtc: new Date('2026-09-08T07:00:00.000Z'),
            shifts: [],
            assignments: [],
          },
        ],
      ),
    };
    const constraints = {
      findConflicts: jest.fn().mockResolvedValue(overrides.conflicts ?? []),
    };
    const events = { emit: jest.fn() };
    const taskRepo = {
      find: jest.fn().mockResolvedValue(
        overrides.tasks ?? [
          { taskId: 501, projectId: 100, name: 'Install cable', tenantId: 20 },
          { taskId: 502, projectId: 100, name: 'Pull cable', tenantId: 20 },
        ],
      ),
    };
    const projectRepo = {
      find: jest.fn().mockResolvedValue(
        overrides.projects ?? [{ projectId: 100, name: 'Site A' }],
      ),
    };
    const depRepo = {
      find: jest.fn().mockResolvedValue(
        overrides.deps ?? [
          {
            taskId: 502,
            dependsOnTaskId: 501,
            dependencyType: 'FS',
          },
        ],
      ),
    };

    const service = new PlannerReadService(
      requirements as any,
      scenarios as any,
      planning as any,
      constraints as any,
      tenantUsers as any,
      events as any,
      taskRepo as any,
      projectRepo as any,
      depRepo as any,
    );

    return {
      service,
      requirements,
      scenarios,
      planning,
      constraints,
      events,
      taskRepo,
      projectRepo,
      depRepo,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    tenantUsers.assertTenantAccess.mockResolvedValue({ tenantId: 20 });
  });

  it('returns dual-lane board DTO without entities', async () => {
    const { service, constraints } = buildService({
      conflicts: [
        {
          code: ConstraintConflictCode.USER_OVERLAP,
          severity: 'hard',
          message: 'overlap',
          details: { taskId: 501, placementKey: 'shift:501:1' },
        },
      ],
    });

    const board = await service.getBoard(1, {
      tenantId: 20,
      schedulingRequirementId: 5,
      scheduleScenarioId: 12,
      scale: 'week',
      view: 'both',
    });

    expect(board.projects).toHaveLength(1);
    expect(board.projects[0].children.map((c) => c.taskId)).toEqual([
      501, 502,
    ]);
    expect(board.resourceLanes.some((l) => l.laneKey === 'user:7')).toBe(true);
    expect(board.bars).toHaveLength(2);
    expect(board.deps).toEqual([
      { fromTaskId: 501, toTaskId: 502, dependencyType: 'FS' },
    ]);
    expect(board.revision).toBe(3);
    expect(board.conflictSummary.hard).toBe(1);
    expect(constraints.findConflicts).toHaveBeenCalledWith(
      expect.objectContaining({ useScenarioBusy: true }),
    );
    expect(board).not.toHaveProperty('requirement');
    expect(board).not.toHaveProperty('plannedTasks');
  });

  it('computes KPIs from planned overlay + conflicts', async () => {
    const { service } = buildService({
      conflicts: [
        {
          code: ConstraintConflictCode.USER_OVERLAP,
          severity: 'hard',
          message: 'overlap',
          details: { taskId: 501 },
        },
      ],
    });

    const kpis = await service.getKpis(1, {
      tenantId: 20,
      schedulingRequirementId: 5,
      scheduleScenarioId: 12,
      rangeStart: '2026-09-01',
      rangeEnd: '2026-09-30',
    });

    expect(kpis.toScheduleCount).toBeGreaterThanOrEqual(1); // 502 unassigned
    expect(kpis.needsAttentionCount).toBe(1);
    expect(kpis.blockersCount).toBe(1);
    expect(kpis.conflictCount).toBe(1);
    expect(kpis.criticalPathCount).toBe(2);
    expect(kpis.shiftedCount).toBe(1);
    expect(kpis.capacityPressure).toEqual(
      expect.objectContaining({
        periodUtil: expect.any(Number),
        peakUtil: expect.any(Number),
        overloadedResourceCount: expect.any(Number),
      }),
    );
  });

  it('uses scenario busy for conflicts and emits UNASSIGNED', async () => {
    const { service, constraints } = buildService({
      conflicts: [],
    });

    const result = await service.getConflicts(1, {
      tenantId: 20,
      schedulingRequirementId: 5,
      scheduleScenarioId: 12,
    });

    expect(constraints.findConflicts).toHaveBeenCalledWith(
      expect.objectContaining({
        useScenarioBusy: true,
        placements: expect.arrayContaining([
          expect.objectContaining({ key: 'shift:501:1', tenantUserId: 7 }),
        ]),
      }),
    );
    expect(
      result.conflicts.some((c) => c.code === ConstraintConflictCode.UNASSIGNED),
    ).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  it('returns empty board/kpis when no scenario', async () => {
    const { service, requirements } = buildService();
    requirements.findOneOrFail.mockResolvedValue({
      ...requirement,
      activeScenarioId: null,
      definitiveScenarioId: null,
    });

    const board = await service.getBoard(1, {
      tenantId: 20,
      schedulingRequirementId: 5,
    });
    const kpis = await service.getKpis(1, {
      tenantId: 20,
      schedulingRequirementId: 5,
    });

    expect(board.projects).toEqual([]);
    expect(board.bars).toEqual([]);
    expect(kpis.needsAttentionCount).toBe(0);
    expect(kpis.toScheduleCount).toBe(0);
  });

  it('rejects tenant access mismatch with 403 path', async () => {
    tenantUsers.assertTenantAccess.mockRejectedValue(
      new RpcException({
        statusCode: 403,
        message: 'Tenant scope mismatch',
      }),
    );
    const { service } = buildService();

    await expect(
      service.getBoard(1, {
        tenantId: 99,
        schedulingRequirementId: 5,
      }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
