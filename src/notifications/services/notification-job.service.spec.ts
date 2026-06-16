import { NotificationJobService } from './notification-job.service';

describe('NotificationJobService', () => {
  it('runs sweeper prepare and dispatch', async () => {
    const pipeline = {
      processEventLog: jest.fn().mockResolvedValue([]),
      dispatchPendingNotifications: jest.fn().mockResolvedValue(undefined),
    };
    const eventLogsService = {
      getAllEventLogs: jest.fn().mockResolvedValue([{ logId: 1 }]),
    };

    const service = new NotificationJobService(
      pipeline as any,
      eventLogsService as any,
    );

    await service.handleNotificationJob();

    expect(pipeline.processEventLog).toHaveBeenCalledWith(1);
    expect(pipeline.dispatchPendingNotifications).toHaveBeenCalled();
  });
});
