import { NotificationImmediateDispatchService } from './notification-immediate-dispatch.service';

describe('NotificationImmediateDispatchService', () => {
  it('no-ops when flag is disabled', () => {
    const pipeline = {
      enqueueEventLogDispatch: jest.fn(),
      enqueueNotificationSend: jest.fn(),
    };
    const flags = {
      isImmediateDispatchEnabled: jest.fn().mockReturnValue(false),
    };

    const service = new NotificationImmediateDispatchService(
      flags as any,
      pipeline as any,
    );

    service.enqueueFromEventLog(1);
    service.enqueueNotificationSend(2);

    expect(pipeline.enqueueEventLogDispatch).not.toHaveBeenCalled();
    expect(pipeline.enqueueNotificationSend).not.toHaveBeenCalled();
  });
});
