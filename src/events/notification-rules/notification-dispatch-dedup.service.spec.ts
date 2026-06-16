import { NotificationDispatchDedupService } from './notification-dispatch-dedup.service';

describe('NotificationDispatchDedupService', () => {
  const getCount = jest.fn();
  const service = new NotificationDispatchDedupService(
    { createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount,
    })) } as any,
    { get: jest.fn().mockReturnValue('5') } as any,
  );

  it('builds stable dispatch keys', () => {
    expect(service.buildDispatchKey(1, 9, 'corr')).toBe('1:9:corr');
  });

  it('detects recent duplicate dispatches', async () => {
    getCount.mockResolvedValue(1);
    await expect(service.hasRecentDispatch(1, 9, 'corr')).resolves.toBe(true);
  });
});
