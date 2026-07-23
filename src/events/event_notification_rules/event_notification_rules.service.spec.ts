import { EventNotificationRulesService } from './event_notification_rules.service';

describe('EventNotificationRulesService', () => {
  const find = jest.fn();
  const findAndCount = jest.fn();

  const service = new EventNotificationRulesService({
    find,
    save: jest.fn(),
    create: jest.fn((row) => row),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAndCount,
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

  it('lists rules without requiring eventName', async () => {
    const rule = { ruleId: 1, eventName: 'six1-event.process_step_ready' };
    findAndCount.mockResolvedValueOnce([[rule], 1]);

    const result = await service.findAll(1, {
      page: 1,
      limit: 10,
      sortBy: 'priority',
      sortOrder: 'ASC',
    });

    expect(result.items).toEqual([rule]);
    expect(findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        order: { priority: 'ASC' },
        take: 10,
        skip: 0,
      }),
    );
  });

  it('filters by eventName when provided', async () => {
    const rule = { ruleId: 1, eventName: 'six1-event.process_step_ready' };
    findAndCount.mockResolvedValueOnce([[rule], 1]);

    await service.findAll(1, {
      eventName: 'six1-event.process_step_ready',
      page: 1,
      limit: 10,
    });

    expect(findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventName: 'six1-event.process_step_ready' },
      }),
    );
  });

  it('persists multi-role recipientSpec on update instead of rewriting to event_actor', async () => {
    const existing = {
      ruleId: 9,
      eventName: 'old_event',
      channelId: 3,
      templateId: 9,
      recipientSpec: { type: 'event_actor' },
      tenantId: 0,
    };
    const findOne = jest.fn().mockResolvedValue(existing);
    const update = jest.fn().mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

    const updateService = new EventNotificationRulesService({
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((row) => row),
      findOne,
      update,
      delete: jest.fn(),
      findAndCount: jest.fn(),
    } as any);

    await updateService.update(1, 9, {
      eventName: 'project_created',
      channelId: 1,
      templateId: 7,
      recipientSpec: {
        type: 'tenant_role',
        roleNames: ['Customer', 'Manager', 'Admin'],
      } as any,
      filterJson: null,
      priority: 100,
      isActive: true,
    });

    expect(update).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        eventName: 'project_created',
        channelId: 1,
        templateId: 7,
        recipientSpec: {
          type: 'tenant_role',
          roleNames: ['Customer', 'Manager', 'Admin'],
        },
        filterJson: null,
        priority: 100,
        isActive: true,
        updatedBy: 1,
      }),
    );
  });
});
