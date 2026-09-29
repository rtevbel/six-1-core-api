import { RpcException } from '@nestjs/microservices';
import { ScheduleScenariosService } from './schedule-scenarios.service';
import { ScheduleScenarioStatus } from '../constants';
import { PromoteOrchestratorService } from './promote-orchestrator.service';

describe('ScheduleScenariosService Epic C lifecycle', () => {
  const tenantUsers = {
    assertTenantAccess: jest.fn().mockResolvedValue({ tenantId: 20 }),
  };

  function buildService(overrides: Record<string, unknown> = {}) {
    const scenarioRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((x) => x),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
      findAndCount: jest.fn(),
    };
    const reqRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    const versionRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      create: jest.fn((x) => x),
      createQueryBuilder: jest.fn(),
    };
    const plannedTaskRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      create: jest.fn((x) => x),
      remove: jest.fn(),
    };
    const shiftRepo = { save: jest.fn(), create: jest.fn((x) => x), remove: jest.fn() };
    const assignmentRepo = {
      save: jest.fn(),
      create: jest.fn((x) => x),
      remove: jest.fn(),
    };
    const requirements = {
      findOneOrFail: jest.fn().mockResolvedValue({
        schedulingRequirementId: 5,
        tenantId: 20,
        status: 'open',
        definitiveScenarioId: null,
        activeScenarioId: null,
        promotePolicy: { promoteFrom: 'definitive_only' },
      }),
    };
    const planning = {
      loadScenarioGraph: jest.fn().mockResolvedValue({ plannedTasks: [] }),
    };
    const audit = {
      appendEvent: jest.fn().mockResolvedValue({}),
    };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: unknown) => unknown) =>
        fn({
          getRepository: (entity: { name: string }) => {
            if (entity.name === 'ScheduleScenarioEntity') return scenarioRepo;
            if (entity.name === 'SchedulingRequirementEntity') return reqRepo;
            if (entity.name === 'ScheduleScenarioVersionEntity')
              return versionRepo;
            if (entity.name === 'ScenarioPlannedTaskEntity')
              return plannedTaskRepo;
            if (entity.name === 'ScenarioPlannedShiftEntity') return shiftRepo;
            if (entity.name === 'ScenarioResourceAssignmentEntity')
              return assignmentRepo;
            return {};
          },
        }),
      ),
    };

    const service = new ScheduleScenariosService(
      scenarioRepo as any,
      reqRepo as any,
      plannedTaskRepo as any,
      shiftRepo as any,
      assignmentRepo as any,
      versionRepo as any,
      {} as any,
      {} as any,
      {} as any,
      requirements as any,
      planning as any,
      audit as any,
      tenantUsers as any,
      dataSource as any,
    );

    return {
      service,
      scenarioRepo,
      reqRepo,
      versionRepo,
      plannedTaskRepo,
      shiftRepo,
      assignmentRepo,
      requirements,
      planning,
      audit,
      dataSource,
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    tenantUsers.assertTenantAccess.mockResolvedValue({ tenantId: 20 });
  });

  it('rejects setting definitive via setStatus', async () => {
    const { service } = buildService();
    await expect(
      service.setStatus(1, {
        tenantId: 20,
        scheduleScenarioId: 1,
        status: 'definitive' as Exclude<ScheduleScenarioStatus, 'definitive'>,
      }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it('save bumps revision and appends a version row', async () => {
    const { service, scenarioRepo, versionRepo, audit } = buildService();
    const scenario = {
      scheduleScenarioId: 12,
      schedulingRequirementId: 5,
      tenantId: 20,
      name: 'Draft A',
      notes: null,
      status: 'draft' as const,
      parentScenarioId: null,
      revision: 3,
      basedOnLiveAt: null,
      promotedAt: null,
      promotedBy: null,
      createdBy: 1,
      createdAt: new Date('2026-09-28T12:00:00Z'),
      updatedAt: new Date('2026-09-28T12:00:00Z'),
    };
    scenarioRepo.findOne
      .mockResolvedValueOnce(scenario)
      .mockResolvedValueOnce({ ...scenario });
    scenarioRepo.save.mockImplementation(async (s) => s);
    versionRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ max: '1' }),
    });
    versionRepo.save.mockImplementation(async (row) => ({
      ...row,
      scheduleScenarioVersionId: 99,
      createdAt: new Date('2026-09-28T12:05:00Z'),
    }));

    const result = await service.save(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      expectedRevision: 3,
      summary: 'Checkpoint',
    });

    expect(tenantUsers.assertTenantAccess).toHaveBeenCalledWith(1, 20);
    expect(result.scenario.revision).toBe(4);
    expect(result.version.version).toBe(2);
    expect(result.version.summary).toBe('Checkpoint');
    expect(audit.appendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'updated',
        payload: expect.objectContaining({ saved: true, version: 2 }),
      }),
    );
  });

  it('save throws structured 409 on stale revision', async () => {
    const { service, scenarioRepo } = buildService();
    scenarioRepo.findOne.mockResolvedValue({
      scheduleScenarioId: 12,
      tenantId: 20,
      status: 'draft',
      revision: 5,
      schedulingRequirementId: 5,
    });

    try {
      await service.save(1, {
        tenantId: 20,
        scheduleScenarioId: 12,
        expectedRevision: 4,
      });
      fail('expected version conflict');
    } catch (e) {
      expect(e).toBeInstanceOf(RpcException);
      expect((e as RpcException).getError()).toMatchObject({
        statusCode: 409,
        errorCode: 'version_conflict',
      });
    }
  });

  it('markDefinitive crowns scenario without promote side effects', async () => {
    const { service, scenarioRepo, reqRepo, versionRepo } = buildService();
    const scenario = {
      scheduleScenarioId: 12,
      schedulingRequirementId: 5,
      tenantId: 20,
      name: 'Plan B',
      notes: null,
      status: 'active' as const,
      parentScenarioId: null,
      revision: 2,
      basedOnLiveAt: null,
      promotedAt: null,
      promotedBy: null,
      createdBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const requirement = {
      schedulingRequirementId: 5,
      tenantId: 20,
      status: 'open',
      definitiveScenarioId: 9,
      activeScenarioId: 12,
    };

    scenarioRepo.findOne
      .mockResolvedValueOnce(scenario)
      .mockResolvedValueOnce({ ...scenario });
    reqRepo.findOne.mockResolvedValue({ ...requirement });
    scenarioRepo.save.mockImplementation(async (s) => s);
    reqRepo.save.mockImplementation(async (r) => r);
    scenarioRepo.update.mockResolvedValue({ affected: 1 });
    versionRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ max: null }),
    });
    versionRepo.save.mockImplementation(async (row) => ({
      ...row,
      scheduleScenarioVersionId: 1,
      createdAt: new Date(),
    }));

    const view = await service.markDefinitive(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      expectedRevision: 2,
    });

    expect(view.status).toBe('definitive');
    expect(view.definitiveScenarioId).toBe(12);
    expect(scenarioRepo.update).toHaveBeenCalledWith(
      { scheduleScenarioId: 9, tenantId: 20 },
      { status: 'archived' },
    );
    expect(versionRepo.save).toHaveBeenCalled();
  });

  it('restoreVersion reapplies overlay and appends a new version', async () => {
    const {
      service,
      scenarioRepo,
      versionRepo,
      plannedTaskRepo,
      audit,
    } = buildService();
    const scenario = {
      scheduleScenarioId: 12,
      schedulingRequirementId: 5,
      tenantId: 20,
      name: 'Draft',
      notes: null,
      status: 'draft' as const,
      parentScenarioId: null,
      revision: 4,
      basedOnLiveAt: null,
      promotedAt: null,
      promotedBy: null,
      createdBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    scenarioRepo.findOne
      .mockResolvedValueOnce(scenario)
      .mockResolvedValueOnce({ ...scenario });
    scenarioRepo.save.mockImplementation(async (s) => s);
    versionRepo.findOne.mockResolvedValue({
      scheduleScenarioVersionId: 50,
      scheduleScenarioId: 12,
      tenantId: 20,
      version: 1,
      summary: 'Old',
      contentHash: 'abc',
      overlayJson: {
        plannedTasks: [
          {
            taskId: 100,
            plannedStartUtc: '2026-09-28T08:00:00.000Z',
            plannedEndUtc: '2026-09-28T12:00:00.000Z',
            shifts: [],
            assignments: [],
          },
        ],
      },
      createdBy: 1,
      createdAt: new Date(),
    });
    plannedTaskRepo.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          taskId: 100,
          plannedStartUtc: new Date('2026-09-28T08:00:00.000Z'),
          plannedEndUtc: new Date('2026-09-28T12:00:00.000Z'),
          tzUsed: 'UTC',
          priority: 0,
          taskStatusId: null,
          notes: null,
          constraintSnapshot: null,
          conflictSummary: null,
          isPlanned: true,
          isReady: false,
          isMilestone: false,
          planningKind: 'task',
          baselineStartUtc: null,
          baselineEndUtc: null,
          deadlineUtc: null,
          shifts: [],
          assignments: [],
        },
      ]);
    plannedTaskRepo.save.mockImplementation(async (row) => ({
      ...row,
      scenarioPlannedTaskId: 1,
    }));
    versionRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ max: '1' }),
    });
    versionRepo.save.mockImplementation(async (row) => ({
      ...row,
      scheduleScenarioVersionId: 51,
      createdAt: new Date(),
    }));

    const result = await service.restoreVersion(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      version: 1,
      expectedRevision: 4,
    });

    expect(result.restoredFromVersion).toBe(1);
    expect(result.scenario.revision).toBe(5);
    expect(result.version.summary).toContain('Restored from version 1');
    expect(audit.appendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ restoredFromVersion: 1 }),
      }),
    );
  });

  it('listVersions returns paginated summaries for the scenario', async () => {
    const { service, scenarioRepo, versionRepo } = buildService();
    scenarioRepo.findOne.mockResolvedValue({
      scheduleScenarioId: 12,
      tenantId: 20,
      schedulingRequirementId: 5,
      status: 'draft',
      revision: 2,
    });
    const createdAt = new Date('2026-09-28T12:05:00.000Z');
    versionRepo.findAndCount.mockResolvedValue([
      [
        {
          scheduleScenarioVersionId: 99,
          scheduleScenarioId: 12,
          tenantId: 20,
          version: 2,
          summary: 'Planning version saved',
          contentHash: 'abc123',
          createdBy: 1,
          createdAt,
        },
      ],
      1,
    ]);

    const result = await service.listVersions(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      page: 1,
      limit: 10,
    });

    expect(versionRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scheduleScenarioId: 12, tenantId: 20 },
        order: { version: 'DESC' },
        take: 10,
        skip: 0,
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      scheduleScenarioVersionId: 99,
      scheduleScenarioId: 12,
      tenantId: 20,
      version: 2,
      summary: 'Planning version saved',
      contentHash: 'abc123',
      createdBy: 1,
      createdAt: createdAt.toISOString(),
    });
    expect(result.pagination).toMatchObject({
      total: 1,
      page: 1,
      limit: 10,
    });
  });

  it('listVersions returns empty items when no history exists', async () => {
    const { service, scenarioRepo, versionRepo } = buildService();
    scenarioRepo.findOne.mockResolvedValue({
      scheduleScenarioId: 12,
      tenantId: 20,
      status: 'draft',
      revision: 1,
    });
    versionRepo.findAndCount.mockResolvedValue([[], 0]);

    const result = await service.listVersions(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
    });

    expect(result.items).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it('getVersion returns overlay detail for a known version', async () => {
    const { service, scenarioRepo, versionRepo } = buildService();
    scenarioRepo.findOne.mockResolvedValue({
      scheduleScenarioId: 12,
      tenantId: 20,
      status: 'draft',
      revision: 2,
    });
    const createdAt = new Date('2026-09-28T12:05:00.000Z');
    versionRepo.findOne.mockResolvedValue({
      scheduleScenarioVersionId: 99,
      scheduleScenarioId: 12,
      tenantId: 20,
      version: 2,
      summary: 'Planning version saved',
      contentHash: 'abc123',
      overlayJson: { plannedTasks: [{ taskId: 7 }] },
      createdBy: 1,
      createdAt,
    });

    const detail = await service.getVersion(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      version: 2,
    });

    expect(versionRepo.findOne).toHaveBeenCalledWith({
      where: {
        scheduleScenarioId: 12,
        tenantId: 20,
        version: 2,
      },
    });
    expect(detail).toMatchObject({
      scheduleScenarioVersionId: 99,
      version: 2,
      summary: 'Planning version saved',
      contentHash: 'abc123',
      overlayJson: { plannedTasks: [{ taskId: 7 }] },
      createdAt: createdAt.toISOString(),
    });
  });

  it('getVersion throws structured 404 when version is missing', async () => {
    const { service, scenarioRepo, versionRepo } = buildService();
    scenarioRepo.findOne.mockResolvedValue({
      scheduleScenarioId: 12,
      tenantId: 20,
      status: 'draft',
      revision: 1,
    });
    versionRepo.findOne.mockResolvedValue(null);

    try {
      await service.getVersion(1, {
        tenantId: 20,
        scheduleScenarioId: 12,
        version: 99,
      });
      fail('expected version_not_found');
    } catch (e) {
      expect(e).toBeInstanceOf(RpcException);
      expect((e as RpcException).getError()).toMatchObject({
        statusCode: 404,
        errorCode: 'version_not_found',
      });
    }
  });

  it('asserts tenant access before mutating', async () => {
    tenantUsers.assertTenantAccess.mockRejectedValue(
      new RpcException({
        statusCode: 403,
        message: 'Tenant scope mismatch',
      }),
    );
    const { service } = buildService();
    try {
      await service.markDefinitive(99, {
        tenantId: 20,
        scheduleScenarioId: 12,
      });
      fail('expected tenant forbidden');
    } catch (e) {
      expect(e).toBeInstanceOf(RpcException);
      expect((e as RpcException).getError()).toMatchObject({
        statusCode: 403,
        message: 'Tenant scope mismatch',
      });
    }
  });
});

describe('PromoteOrchestratorService definitive_only', () => {
  it('rejects promote when scenario is not definitive', async () => {
    const scenarios = {
      findOneOrFail: jest.fn().mockResolvedValue({
        scheduleScenarioId: 9,
        status: 'active',
        revision: 1,
        schedulingRequirementId: 3,
      }),
    };
    const requirements = {
      findOneOrFail: jest.fn().mockResolvedValue({
        schedulingRequirementId: 3,
        status: 'open',
        definitiveScenarioId: null,
        promotePolicy: { promoteFrom: 'definitive_only' },
      }),
    };
    const tenantUsers = {
      assertTenantAccess: jest.fn().mockResolvedValue({ tenantId: 1 }),
    };
    const service = new PromoteOrchestratorService(
      {} as any,
      scenarios as any,
      requirements as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      tenantUsers as any,
      {} as any,
      {} as any,
    );

    try {
      await service.promote(1, { tenantId: 1, scheduleScenarioId: 9 });
      fail('expected promote_requires_definitive');
    } catch (e) {
      expect(e).toBeInstanceOf(RpcException);
      expect((e as RpcException).getError()).toMatchObject({
        statusCode: 400,
        errorCode: 'promote_requires_definitive',
      });
    }
  });

  it('rejects promote of draft under definitive_only', async () => {
    const scenarios = {
      findOneOrFail: jest.fn().mockResolvedValue({
        scheduleScenarioId: 9,
        status: 'draft',
        revision: 1,
        schedulingRequirementId: 3,
      }),
    };
    const requirements = {
      findOneOrFail: jest.fn().mockResolvedValue({
        schedulingRequirementId: 3,
        status: 'open',
        definitiveScenarioId: 2,
        promotePolicy: { promoteFrom: 'definitive_only' },
      }),
    };
    const tenantUsers = {
      assertTenantAccess: jest.fn().mockResolvedValue({ tenantId: 1 }),
    };
    const service = new PromoteOrchestratorService(
      {} as any,
      scenarios as any,
      requirements as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      tenantUsers as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.promote(1, { tenantId: 1, scheduleScenarioId: 9 }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
