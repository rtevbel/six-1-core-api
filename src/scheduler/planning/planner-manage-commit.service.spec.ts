import { PlannerManageService } from './planner-manage.service';

describe('PlannerManageService stampCommittedForPromote (Week 9)', () => {
  it('stamps committedAt / committedRevision on all drafts', async () => {
    const rows = [
      {
        recordKey: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        attrs: { code: 'P1' },
      },
      {
        recordKey: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
        attrs: { hoursPerDay: 8 },
      },
    ];
    const manageRepo = {
      find: jest.fn().mockResolvedValue(rows),
      save: jest.fn(async (r) => r),
    };
    const service = new PlannerManageService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      manageRepo as any,
    );

    const result = await service.stampCommittedForPromote(
      12,
      20,
      7,
      new Date('2026-11-21T10:00:00.000Z'),
    );

    expect(result).toEqual({
      committedCount: 2,
      recordKeys: [
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
      ],
    });
    expect(rows[0].attrs).toMatchObject({
      code: 'P1',
      committedAt: '2026-11-21T10:00:00.000Z',
      committedRevision: 7,
    });
    expect(manageRepo.save).toHaveBeenCalledWith(rows);
  });

  it('returns empty when no drafts', async () => {
    const manageRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };
    const service = new PlannerManageService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      manageRepo as any,
    );
    const result = await service.stampCommittedForPromote(12, 20, 7);
    expect(result).toEqual({ committedCount: 0, recordKeys: [] });
    expect(manageRepo.save).not.toHaveBeenCalled();
  });
});
