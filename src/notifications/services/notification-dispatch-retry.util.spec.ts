import { computeNotificationRetryDelayMs } from './notification-dispatch-retry.util';

describe('notification-dispatch-retry.util', () => {
  it('doubles backoff per attempt', () => {
    expect(computeNotificationRetryDelayMs(1, 30)).toBe(30_000);
    expect(computeNotificationRetryDelayMs(2, 30)).toBe(60_000);
    expect(computeNotificationRetryDelayMs(3, 30)).toBe(120_000);
  });
});
