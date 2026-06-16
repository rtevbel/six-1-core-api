import { EventNotificationRulesService } from './event_notification_rules.service';

describe('EventNotificationRulesService', () => {
  const find = jest.fn();

  const service = new EventNotificationRulesService({
    find,
    save: jest.fn(),
    create: jest.fn((row) => row),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAndCount: jest.fn(),
  } as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers tenant rules over global', async () => {
    find.mockImplementation(({ where }: { where: { tenantId: number } }) => {
      if (where.tenantId === 5) {
        return [{ ruleId: 1, priority: 10 }];
      }
      return [{ ruleId: 2, priority: 10 }];
    });

    const rules = await service.findActiveRulesForEvent(
      'six1-event.process_step_ready',
      5,
    );

    expect(rules).toEqual([{ ruleId: 1, priority: 10 }]);
    expect(find).toHaveBeenCalledTimes(1);
  });

  it('falls back to global when tenant has no rules', async () => {
    find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ruleId: 2, priority: 10 }]);

    const rules = await service.findActiveRulesForEvent(
      'six1-event.process_step_ready',
      5,
    );

    expect(rules).toEqual([{ ruleId: 2, priority: 10 }]);
    expect(find).toHaveBeenCalledTimes(2);
  });
});
