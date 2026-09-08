import { ConstraintCapacityEngine } from './constraint-capacity.engine';
import { ConstraintConflictCode } from './constraint.codes';
import { ResourceAvailabilityAdapter } from './resource-availability.adapter';

describe('ConstraintCapacityEngine', () => {
  const calendar = {
    getTimezone: jest.fn().mockResolvedValue('UTC'),
    isOffDateLocal: jest.fn().mockResolvedValue(false),
    getWorkingIntervalsLocal: jest
      .fn()
      .mockResolvedValue([{ start: '09:00', end: '17:00' }]),
  };

  const taskCtx = {
    getTaskContext: jest.fn().mockResolvedValue({
      tenantId: 1,
      projectId: 1,
      taskStatusId: 1,
      assigneeId: null,
      teamId: null,
      startConstraintType: 'NoEarlierThan',
      startConstraintUtc: new Date('2026-09-10T10:00:00.000Z'),
      finishConstraintUtc: null,
      estimatedDuration: 2,
      effortHours: null,
      schedulingMode: 'fixed_duration',
      defaultShiftHours: 4,
    }),
  };

  const deps = {
    earliestGateUtc: jest
      .fn()
      .mockResolvedValue(new Date('2026-09-10T08:00:00.000Z')),
  };

  const resourceAvailability = {
    expandAvailability: jest.fn().mockResolvedValue({
      windows: [],
      unsupportedRules: [],
    }),
    findBlackoutOverlaps: jest.fn().mockResolvedValue([]),
  } as unknown as ResourceAvailabilityAdapter;

  const schedRepo = {
    createQueryBuilder: jest.fn(),
  };
  const resourceRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const assignmentRepo = {
    createQueryBuilder: jest.fn(),
  };
  const resourceMetaRepo = {
    findOne: jest.fn().mockResolvedValue(null),
  };
  const teamMemberRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  let engine: ConstraintCapacityEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new ConstraintCapacityEngine(
      calendar as any,
      taskCtx as any,
      deps as any,
      resourceAvailability,
      schedRepo as any,
      resourceRepo as any,
      assignmentRepo as any,
      resourceMetaRepo as any,
      teamMemberRepo as any,
    );
  });

  it('fitWindow applies dependency gate and task NoEarlierThan', async () => {
    const fitted = await engine.fitWindow({
      tenantId: 1,
      tenantUserId: null,
      requestedStartUtc: new Date('2026-09-10T07:00:00.000Z'),
      requestedEndUtc: new Date('2026-09-10T09:00:00.000Z'),
      taskId: 42,
    });
    // max(dep 08:00, constraint 10:00) then snap into working hours => 10:00
    expect(fitted.effectiveStartUtc.toISOString()).toBe(
      '2026-09-10T10:00:00.000Z',
    );
    expect(fitted.dependencyGateUtc?.toISOString()).toBe(
      '2026-09-10T08:00:00.000Z',
    );
  });

  it('validatePlacement returns INVALID_WINDOW for inverted range', async () => {
    const result = await engine.validatePlacement({
      tenantId: 1,
      startUtc: new Date('2026-09-10T12:00:00.000Z'),
      endUtc: new Date('2026-09-10T11:00:00.000Z'),
      mode: 'parent_window',
    });
    expect(result.ok).toBe(false);
    expect(result.hard[0].code).toBe(ConstraintConflictCode.INVALID_WINDOW);
  });

  it('validatePlacement returns OUTSIDE_HORIZON', async () => {
    const result = await engine.validatePlacement({
      tenantId: 1,
      startUtc: new Date('2026-09-10T10:00:00.000Z'),
      endUtc: new Date('2026-09-10T12:00:00.000Z'),
      horizonStartUtc: new Date('2026-09-11T00:00:00.000Z'),
      mode: 'parent_window',
    });
    expect(result.hard.some((c) => c.code === ConstraintConflictCode.OUTSIDE_HORIZON)).toBe(
      true,
    );
  });

  it('validatePlacement returns RESOURCE_BLACKOUT', async () => {
    resourceRepo.findOne.mockResolvedValue({
      resourceId: 9,
      type: 'equipment',
    });
    (resourceAvailability.findBlackoutOverlaps as jest.Mock).mockResolvedValue([
      { blackoutId: 1 },
    ]);
    assignmentRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });

    const result = await engine.validatePlacement({
      tenantId: 1,
      resourceId: 9,
      startUtc: new Date('2026-09-10T10:00:00.000Z'),
      endUtc: new Date('2026-09-10T12:00:00.000Z'),
      mode: 'assignment',
    });
    expect(
      result.hard.some((c) => c.code === ConstraintConflictCode.RESOURCE_BLACKOUT),
    ).toBe(true);
  });

  it('validatePlacement returns EQUIPMENT_OVERLAP', async () => {
    resourceRepo.findOne.mockResolvedValue({
      resourceId: 9,
      type: 'equipment',
    });
    (resourceAvailability.findBlackoutOverlaps as jest.Mock).mockResolvedValue(
      [],
    );
    assignmentRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue([{ resourceAssignmentId: 55, scheduledTaskId: 1 }]),
    });

    const result = await engine.validatePlacement({
      tenantId: 1,
      resourceId: 9,
      startUtc: new Date('2026-09-10T10:00:00.000Z'),
      endUtc: new Date('2026-09-10T12:00:00.000Z'),
      mode: 'assignment',
    });
    expect(
      result.hard.some((c) => c.code === ConstraintConflictCode.EQUIPMENT_OVERLAP),
    ).toBe(true);
  });

  it('validatePlacement returns USER_OVERLAP', async () => {
    schedRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ scheduledTaskId: 7 }]),
    });

    const result = await engine.validatePlacement({
      tenantId: 1,
      tenantUserId: 3,
      startUtc: new Date('2026-09-10T10:00:00.000Z'),
      endUtc: new Date('2026-09-10T12:00:00.000Z'),
      mode: 'shift',
    });
    expect(
      result.hard.some((c) => c.code === ConstraintConflictCode.USER_OVERLAP),
    ).toBe(true);
  });

  it('validatePlacement returns RESOURCE_UNAVAILABLE when outside windows', async () => {
    resourceRepo.findOne.mockResolvedValue({
      resourceId: 9,
      type: 'equipment',
    });
    (resourceAvailability.expandAvailability as jest.Mock).mockResolvedValue({
      windows: [
        {
          startUtc: new Date('2026-09-10T13:00:00.000Z'),
          endUtc: new Date('2026-09-10T15:00:00.000Z'),
        },
      ],
      unsupportedRules: [],
    });
    (resourceAvailability.findBlackoutOverlaps as jest.Mock).mockResolvedValue(
      [],
    );
    assignmentRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });

    const result = await engine.validatePlacement({
      tenantId: 1,
      resourceId: 9,
      startUtc: new Date('2026-09-10T10:00:00.000Z'),
      endUtc: new Date('2026-09-10T12:00:00.000Z'),
      mode: 'assignment',
    });
    expect(
      result.hard.some(
        (c) => c.code === ConstraintConflictCode.RESOURCE_UNAVAILABLE,
      ),
    ).toBe(true);
  });
});
