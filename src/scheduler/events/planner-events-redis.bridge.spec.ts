import { PlannerEventsRedisBridge } from './planner-events-redis.bridge';

describe('PlannerEventsRedisBridge', () => {
  it('fail-open when redis client is null', async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const bridge = new PlannerEventsRedisBridge(config as any);
    await expect(
      bridge.onScenarioUpdated({
        tenantId: 20,
        requirementId: 5,
        scheduleScenarioId: 12,
        revision: 3,
        cause: 'task_upsert',
      }),
    ).resolves.toBeUndefined();
  });

  it('publishes notify payload with cause on scenario updated', async () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'REDIS_HOST' || key.includes('HOST')) return '127.0.0.1';
        if (key === 'REDIS_PORT' || key.includes('PORT')) return 6379;
        return undefined;
      }),
    };
    const bridge = new PlannerEventsRedisBridge(config as any);
    const publish = jest.fn().mockResolvedValue(1);
    (bridge as any).client = { publish };

    await bridge.onScenarioUpdated({
      tenantId: 20,
      requirementId: 5,
      scheduleScenarioId: 12,
      revision: 9,
      actorUserId: 42,
      cause: 'task_upsert',
    });

    expect(publish).toHaveBeenCalledWith(
      'planner:tenant:20:events',
      expect.any(String),
    );
    const payload = JSON.parse(publish.mock.calls[0][1]);
    expect(payload).toMatchObject({
      type: 'scheduler.scenario.updated',
      tenantId: 20,
      requirementId: 5,
      scenarioId: 12,
      revision: 9,
      actorId: 42,
      cause: 'task_upsert',
    });
    expect(payload.changedAt).toEqual(expect.any(String));
  });

  it('defaults promote/conflicts causes when omitted', async () => {
    const bridge = new PlannerEventsRedisBridge({
      get: jest.fn(),
    } as any);
    const publish = jest.fn().mockResolvedValue(1);
    (bridge as any).client = { publish };

    await bridge.onScenarioPromoted({
      tenantId: 20,
      requirementId: 5,
      scheduleScenarioId: 12,
      revision: 10,
      actorUserId: 1,
    });
    await bridge.onConflictsChanged({
      tenantId: 20,
      requirementId: 5,
      scheduleScenarioId: 12,
      count: 2,
    });

    expect(JSON.parse(publish.mock.calls[0][1]).cause).toBe('promote');
    expect(JSON.parse(publish.mock.calls[1][1]).cause).toBe('conflicts');
  });

  it('fail-open when publish throws', async () => {
    const bridge = new PlannerEventsRedisBridge({
      get: jest.fn(),
    } as any);
    (bridge as any).client = {
      publish: jest.fn().mockRejectedValue(new Error('redis down')),
    };

    await expect(
      bridge.onScenarioUpdated({
        tenantId: 20,
        requirementId: 5,
        scheduleScenarioId: 12,
        revision: 1,
      }),
    ).resolves.toBeUndefined();
  });
});
