import { RpcException } from '@nestjs/microservices';
import { PlannerMutateService } from './planner-mutate.service';
import { ConstraintConflictCode } from '../constraints/constraint.codes';

describe('PlannerMutateService', () => {
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
            sheetExtras: null,
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

    const constraintEventRepo = {
      create: jest.fn((row: unknown) => row),
      save: jest.fn().mockImplementation(async (row: Record<string, unknown>) => ({
        ...row,
        scheduleConstraintEventId: 77,
      })),
    };

    const service = new PlannerMutateService(
      tenantUsers as any,
      requirements as any,
      scenarios as any,
      planning as any,
      constraints as any,
      taskRepo as any,
      constraintEventRepo as any,
    );

    return {
      service,
      planning,
      scenarios,
      requirements,
      constraints,
      taskRepo,
      constraintEventRepo,
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
    expect(result.plannedTask.sheetExtras).toBeNull();
    expect(result.conflictSummary).toEqual({ hard: 0, soft: 0 });
    expect(result).not.toHaveProperty('shifts');
  });

  it('upserts rich sheet extras and returns them on plannedTask', async () => {
    const extras = {
      requiredSkills: ['electrical'],
      partnerRecordKeys: ['partner-1'],
      requiredMaterials: [{ recordKey: 'mat-1', qty: 4 }],
      requiredEquipmentRecordKeys: ['eq-1'],
      assignedEquipmentRecordKeys: [],
      predecessors: [
        { dependsOnTaskId: 501, dependencyType: 'FS' as const, lagDays: 1 },
      ],
    };
    const { service, planning } = buildService({
      upsertResult: {
        revision: 6,
        conflicts: [],
        plannedTask: {
          scenarioPlannedTaskId: 9,
          taskId: 101,
          plannedStartUtc: new Date('2026-10-08T08:00:00.000Z'),
          plannedEndUtc: new Date('2026-10-08T12:00:00.000Z'),
          tzUsed: 'UTC',
          planningKind: 'external',
          deadlineUtc: null,
          notes: null,
          isPlanned: true,
          isReady: false,
          isMilestone: false,
          priority: 0,
          taskStatusId: null,
          sheetExtras: extras,
          shifts: [],
          assignments: [],
        },
      },
    });

    const result = await service.upsertTask(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      taskId: 101,
      plannedStartUtc: '2026-10-08T08:00:00.000Z',
      plannedEndUtc: '2026-10-08T12:00:00.000Z',
      planningKind: 'external',
      sheetExtras: extras,
      expectedRevision: 5,
    });

    expect(planning.upsertPlannedTask).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        planningKind: 'external',
        sheetExtras: expect.objectContaining({
          partnerRecordKeys: ['partner-1'],
          predecessors: [
            expect.objectContaining({ dependsOnTaskId: 501, lagDays: 1 }),
          ],
        }),
      }),
    );
    expect(result.plannedTask.sheetExtras?.partnerRecordKeys).toEqual([
      'partner-1',
    ]);
    expect(result.conflictSummary.hard).toBe(0);
  });

  it('adds PARTNER_MISSING when external work block has no partners', async () => {
    const { service } = buildService({
      upsertResult: {
        revision: 7,
        conflicts: [],
        plannedTask: {
          scenarioPlannedTaskId: 9,
          taskId: 101,
          plannedStartUtc: new Date('2026-10-08T08:00:00.000Z'),
          plannedEndUtc: new Date('2026-10-08T12:00:00.000Z'),
          tzUsed: 'UTC',
          planningKind: 'external',
          deadlineUtc: null,
          notes: null,
          isPlanned: true,
          isReady: false,
          isMilestone: false,
          priority: 0,
          taskStatusId: null,
          sheetExtras: {
            requiredSkills: [],
            partnerRecordKeys: [],
            requiredMaterials: [],
            requiredEquipmentRecordKeys: [],
            assignedEquipmentRecordKeys: [],
            predecessors: [],
          },
          shifts: [],
          assignments: [],
        },
      },
    });

    const result = await service.upsertTask(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      taskId: 101,
      plannedStartUtc: '2026-10-08T08:00:00.000Z',
      plannedEndUtc: '2026-10-08T12:00:00.000Z',
      planningKind: 'external',
      sheetExtras: {
        partnerRecordKeys: [],
      },
      expectedRevision: 6,
    });

    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ConstraintConflictCode.PARTNER_MISSING,
          severity: 'hard',
        }),
      ]),
    );
    expect(result.conflictSummary.hard).toBeGreaterThanOrEqual(1);
    expect(result.revision).toBe(7);
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

  it('applyImpact upserts and appends resolved event when clean', async () => {
    const { service, planning, constraintEventRepo } = buildService();

    const result = await service.applyImpact(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      taskId: 101,
      plannedStartUtc: '2026-10-09T08:00:00.000Z',
      plannedEndUtc: '2026-10-09T12:00:00.000Z',
      tenantUserId: 55,
      expectedRevision: 4,
    });

    expect(planning.upsertPlannedTask).toHaveBeenCalled();
    expect(constraintEventRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 20,
        scheduleScenarioId: 12,
        schedulingRequirementId: 5,
        action: 'resolved',
        taskIds: [101],
        actorId: 1,
        actorType: 'human',
      }),
    );
    expect(result.action).toBe('resolved');
    expect(result.scheduleConstraintEventId).toBe(77);
    expect(result.revision).toBe(5);
  });

  it('applyImpact records applied_with_issues when conflicts remain', async () => {
    const { service, constraintEventRepo } = buildService({
      upsertResult: {
        revision: 5,
        conflicts: [
          {
            code: ConstraintConflictCode.USER_OVERLAP,
            severity: 'hard',
            message: 'overlap',
          },
        ],
        plannedTask: {
          scenarioPlannedTaskId: 9,
          taskId: 101,
          plannedStartUtc: new Date('2026-10-09T08:00:00.000Z'),
          plannedEndUtc: new Date('2026-10-09T12:00:00.000Z'),
          tzUsed: 'UTC',
          planningKind: 'task',
          deadlineUtc: null,
          notes: null,
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
              plannedStartUtc: new Date('2026-10-09T08:00:00.000Z'),
              plannedEndUtc: new Date('2026-10-09T12:00:00.000Z'),
            },
          ],
          assignments: [],
        },
      },
    });

    const result = await service.applyImpact(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      taskId: 101,
      plannedStartUtc: '2026-10-09T08:00:00.000Z',
      plannedEndUtc: '2026-10-09T12:00:00.000Z',
      tenantUserId: 55,
    });

    expect(result.action).toBe('applied_with_issues');
    expect(constraintEventRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'applied_with_issues',
        conflictCodes: [ConstraintConflictCode.USER_OVERLAP],
      }),
    );
  });

  it('applyImpact records overridden when acknowledgeOverride + hard', async () => {
    const { service, constraintEventRepo } = buildService({
      upsertResult: {
        revision: 6,
        conflicts: [
          {
            code: ConstraintConflictCode.USER_OVERLAP,
            severity: 'hard',
            message: 'overlap',
          },
        ],
        plannedTask: {
          scenarioPlannedTaskId: 9,
          taskId: 101,
          plannedStartUtc: new Date('2026-10-09T08:00:00.000Z'),
          plannedEndUtc: new Date('2026-10-09T12:00:00.000Z'),
          tzUsed: 'UTC',
          planningKind: 'task',
          deadlineUtc: null,
          notes: null,
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
              plannedStartUtc: new Date('2026-10-09T08:00:00.000Z'),
              plannedEndUtc: new Date('2026-10-09T12:00:00.000Z'),
            },
          ],
          assignments: [],
        },
      },
    });

    const result = await service.applyImpact(1, {
      tenantId: 20,
      scheduleScenarioId: 12,
      taskId: 101,
      plannedStartUtc: '2026-10-09T08:00:00.000Z',
      plannedEndUtc: '2026-10-09T12:00:00.000Z',
      tenantUserId: 55,
      acknowledgeOverride: true,
      reason: 'Client deadline',
    });

    expect(result.action).toBe('overridden');
    expect(constraintEventRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'overridden',
        reason: 'Client deadline',
      }),
    );
  });

  it('applyImpact propagates tenant forbidden', async () => {
    tenantUsers.assertTenantAccess.mockRejectedValue(
      new RpcException({
        statusCode: 403,
        message: 'Tenant scope mismatch',
      }),
    );
    const { service, constraintEventRepo } = buildService();

    await expect(
      service.applyImpact(1, {
        tenantId: 99,
        scheduleScenarioId: 12,
        taskId: 101,
        plannedStartUtc: '2026-10-09T08:00:00.000Z',
        plannedEndUtc: '2026-10-09T12:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(RpcException);
    expect(constraintEventRepo.save).not.toHaveBeenCalled();
  });
});
