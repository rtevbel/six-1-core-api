import { RpcException } from '@nestjs/microservices';
import { PlannerManageService } from './planner-manage.service';
import { ScheduleScenarioEntity } from '../entities/schedule_scenario.entity';
import { ScheduleScenarioManageRecordEntity } from '../entities/schedule_scenario_manage_record.entity';

describe('PlannerManageService', () => {
  const tenantUsers = {
    assertTenantAccess: jest.fn().mockResolvedValue({ tenantId: 20 }),
  };

  const requirement = {
    schedulingRequirementId: 5,
    tenantId: 20,
    status: 'open',
  };

  function buildService(overrides: {
    scenario?: Partial<ScheduleScenarioEntity> | null;
    rows?: ScheduleScenarioManageRecordEntity[];
    findOneRow?: ScheduleScenarioManageRecordEntity | null;
    childRow?: ScheduleScenarioManageRecordEntity | null;
    linkedRow?: ScheduleScenarioManageRecordEntity | null;
    teamRow?: ScheduleScenarioManageRecordEntity | null;
  } = {}) {
    const scenario: ScheduleScenarioEntity = {
      scheduleScenarioId: 12,
      schedulingRequirementId: 5,
      tenantId: 20,
      revision: 4,
      status: 'draft',
      name: 'Draft',
      ...(overrides.scenario ?? {}),
    } as ScheduleScenarioEntity;

    const scenarioRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue(
          overrides.scenario === null ? null : scenario,
        ),
      save: jest.fn().mockImplementation(async (row) => row),
    };

    const manageRepo = {
      findAndCount: jest
        .fn()
        .mockResolvedValue([overrides.rows ?? [], overrides.rows?.length ?? 0]),
      find: jest.fn().mockResolvedValue(overrides.rows ?? []),
      findOne: jest.fn().mockResolvedValue(overrides.findOneRow ?? null),
      create: jest.fn((x) => x),
      save: jest.fn().mockImplementation(async (row) => ({
        ...row,
        scheduleScenarioManageRecordId:
          row.scheduleScenarioManageRecordId ?? 99,
        createdAt: new Date('2026-11-03T10:00:00.000Z'),
        updatedAt: new Date('2026-11-03T10:00:00.000Z'),
      })),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => {
        const qb = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest
            .fn()
            .mockResolvedValue(
              overrides.linkedRow ?? overrides.teamRow ?? null,
            ),
        };
        return qb;
      }),
    };

    const requirements = {
      findOneOrFail: jest.fn().mockResolvedValue(requirement),
    };

    const dataSource = {
      transaction: jest.fn(async (fn: (m: unknown) => unknown) =>
        fn({
          getRepository: (entity: { name: string }) => {
            if (entity.name === 'ScheduleScenarioEntity') return scenarioRepo;
            if (entity.name === 'ScheduleScenarioManageRecordEntity') {
              return {
                ...manageRepo,
                findOne: jest.fn().mockImplementation(async (opts: any) => {
                  if (opts?.where?.parentRecordKey) {
                    return overrides.childRow ?? null;
                  }
                  // Explicit override (including null = not found) for create-with-client-key.
                  if ('findOneRow' in overrides) {
                    return overrides.findOneRow ?? null;
                  }
                  if (opts?.where?.recordKey && opts?.where?.category === 'project') {
                    return {
                      recordKey: opts.where.recordKey,
                      category: 'project',
                    } as ScheduleScenarioManageRecordEntity;
                  }
                  return opts?.where?.recordKey
                    ? ({
                        scheduleScenarioManageRecordId: 1,
                        tenantId: 20,
                        scheduleScenarioId: 12,
                        recordKey: opts.where.recordKey,
                        category: 'person',
                        name: 'Sara',
                        parentRecordKey: null,
                        linkedMasterId: null,
                        attrs: {},
                      } as ScheduleScenarioManageRecordEntity)
                    : null;
                }),
              };
            }
            return {};
          },
        }),
      ),
    };

    const service = new PlannerManageService(
      tenantUsers as any,
      requirements as any,
      dataSource as any,
      scenarioRepo as any,
      manageRepo as any,
    );

    return { service, scenarioRepo, manageRepo, requirements, tenantUsers };
  }

  it('lists empty manage records successfully', async () => {
    const { service } = buildService({ rows: [] });
    const result = await service.list(1, {
      tenantId: 20,
      schedulingRequirementId: 5,
      scheduleScenarioId: 12,
    });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.revision).toBe(4);
  });

  it('creates a person draft and bumps revision', async () => {
    const { service } = buildService();
    const result = await service.upsert(1, {
      tenantId: 20,
      schedulingRequirementId: 5,
      scheduleScenarioId: 12,
      category: 'person',
      name: 'Sara',
      attrs: { hoursPerDay: 8, skills: ['electrical'] },
      expectedRevision: 4,
    });
    expect(result.revision).toBe(5);
    expect(result.item.category).toBe('person');
    expect(result.item.name).toBe('Sara');
    expect(result.item.recordKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result.item.attrs).toMatchObject({
      hoursPerDay: 8,
      skills: ['electrical'],
    });
  });

  it('creates when client supplies a new recordKey (Add-session upsert)', async () => {
    const { service } = buildService({ findOneRow: null });
    const clientKey = '2046543f-fdc9-4ba3-bd96-eca0e518d45a';
    const result = await service.upsert(1, {
      tenantId: 20,
      schedulingRequirementId: 5,
      scheduleScenarioId: 12,
      recordKey: clientKey,
      category: 'project',
      name: 'W7 Bridge Project Upsert',
      attrs: { customer: 'Acme Bridge Customer' },
      expectedRevision: 4,
    });
    expect(result.revision).toBe(5);
    expect(result.item.recordKey).toBe(clientKey);
    expect(result.item.name).toBe('W7 Bridge Project Upsert');
    expect(result.item.attrs).toMatchObject({
      customer: 'Acme Bridge Customer',
    });
  });

  it('rejects stale expectedRevision with version_conflict', async () => {
    const { service } = buildService();
    await expect(
      service.upsert(1, {
        tenantId: 20,
        schedulingRequirementId: 5,
        scheduleScenarioId: 12,
        category: 'project',
        name: 'Site A',
        expectedRevision: 3,
      }),
    ).rejects.toBeInstanceOf(RpcException);
    try {
      await service.upsert(1, {
        tenantId: 20,
        schedulingRequirementId: 5,
        scheduleScenarioId: 12,
        category: 'project',
        name: 'Site A',
        expectedRevision: 3,
      });
    } catch (e) {
      expect((e as RpcException).getError()).toMatchObject({
        statusCode: 409,
        errorCode: 'version_conflict',
      });
    }
  });

  it('blocks delete when subprojects remain (referential_conflict)', async () => {
    const { service } = buildService({
      findOneRow: {
        scheduleScenarioManageRecordId: 1,
        tenantId: 20,
        scheduleScenarioId: 12,
        recordKey: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        category: 'project',
        name: 'Parent',
        parentRecordKey: null,
        linkedMasterId: null,
        attrs: {},
      } as ScheduleScenarioManageRecordEntity,
      childRow: {
        scheduleScenarioManageRecordId: 2,
        recordKey: 'aaaaaaaa-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        category: 'project',
        parentRecordKey: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      } as ScheduleScenarioManageRecordEntity,
    });

    try {
      await service.remove(1, {
        tenantId: 20,
        schedulingRequirementId: 5,
        scheduleScenarioId: 12,
        recordKey: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        expectedRevision: 4,
      });
      fail('expected referential conflict');
    } catch (e) {
      expect((e as RpcException).getError()).toMatchObject({
        statusCode: 409,
        errorCode: 'referential_conflict',
      });
    }
  });

  it('forbids tenant mismatch via assertTenantAccess', async () => {
    const { service, tenantUsers } = buildService();
    tenantUsers.assertTenantAccess.mockRejectedValueOnce(
      new RpcException({
        statusCode: 403,
        message: 'Tenant scope mismatch',
      }),
    );
    await expect(
      service.list(1, {
        tenantId: 99,
        schedulingRequirementId: 5,
        scheduleScenarioId: 12,
      }),
    ).rejects.toMatchObject({
      error: expect.objectContaining({ statusCode: 403 }),
    });
  });

  it('returns scenario_draft catalog with process/object keys per category', async () => {
    const { service } = buildService();
    const result = await service.catalog(1, { tenantId: 20 });
    expect(result.bindingMode).toBe('scenario_draft');
    expect(result.runnerKind).toBe('scenario_draft');
    expect(result.tasksTab).toEqual({
      tabLabel: 'Tasks',
      upsertViaManage: false,
      openTaskSheet: true,
    });
    expect(result.categories).toHaveLength(6);
    const project = result.categories.find((c) => c.category === 'project');
    expect(project).toMatchObject({
      objectType: 'planner_manage_project',
      processKey: 'planner.manage.project',
      processTemplateName: 'Planner Manage — Project',
      templateSetKey: 'planner_manage',
      configObjectBindingMode: 'standalone',
      writesLiveMaster: false,
      resolveInstanceWith: 'recordKey',
    });
    expect(project?.fields.some((f) => f.fieldKey === 'name')).toBe(true);
    expect(project?.crudPatterns.list).toBe(
      'v0.1_scheduler_planner_manage_list',
    );
  });

  it('returns schema for a category', async () => {
    const { service } = buildService();
    const result = await service.schema(1, {
      tenantId: 20,
      category: 'material',
    });
    expect(result).toMatchObject({
      category: 'material',
      objectType: 'planner_manage_material',
      processKey: 'planner.manage.material',
      processTemplateName: 'Planner Manage — Material',
      templateSetKey: 'planner_manage',
      bindingMode: 'scenario_draft',
      writesLiveMaster: false,
    });
    expect(result.fields.map((f) => f.fieldKey)).toEqual(
      expect.arrayContaining(['name', 'stock', 'reserved', 'projectRecordKey']),
    );
  });

  it('resolves a manage draft by recordKey into Runner values', async () => {
    const recordKey = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
    const { service } = buildService({
      findOneRow: {
        scheduleScenarioManageRecordId: 7,
        tenantId: 20,
        scheduleScenarioId: 12,
        recordKey,
        category: 'person',
        name: 'Sara',
        parentRecordKey: null,
        linkedMasterId: null,
        attrs: { hoursPerDay: 8, skills: ['hvac'], absent: false },
        createdAt: new Date('2026-11-03T10:00:00.000Z'),
        updatedAt: new Date('2026-11-03T10:00:00.000Z'),
      } as unknown as ScheduleScenarioManageRecordEntity,
    });
    const result = await service.resolve(1, {
      tenantId: 20,
      schedulingRequirementId: 5,
      scheduleScenarioId: 12,
      recordKey,
    });
    expect(result.runnerKind).toBe('scenario_draft');
    expect(result.item.name).toBe('Sara');
    expect(result.values).toMatchObject({
      name: 'Sara',
      hoursPerDay: 8,
      skills: ['hvac'],
      absent: false,
    });
  });
});
