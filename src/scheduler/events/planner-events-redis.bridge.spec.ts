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
      }),
    ).resolves.toBeUndefined();
  });
});
