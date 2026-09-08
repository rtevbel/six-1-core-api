import { NotificationDispatchPipelineService } from './notification-dispatch-pipeline.service';

describe('NotificationDispatchPipelineService', () => {
  const notificationsService = {
    create: jest.fn(),
  };
  const eventLogsService = {
    findByIdForDispatch: jest.fn(),
    update: jest.fn(),
  };
  const eventListenersService = {
    getListenersByEventId: jest.fn(),
  };
  const eventNotificationRulesService = {
    findActiveRulesForEvent: jest.fn(),
  };
  const notificationLogsService = {
    create: jest.fn(),
  };
  const notificationChannelsService = {
    findById: jest.fn(),
  };
  const userNotificationPreferenceService = {
    isChannelEnabled: jest.fn(),
  };
  const templateEngine = {
    renderFromEventLog: jest.fn(),
  };
  const platformFlags = {
    isImmediateDispatchEnabled: jest.fn().mockReturnValue(false),
  };
  const platformEventFlags = {
    isNotificationRulesEnabled: jest.fn().mockReturnValue(true),
  };
  const notificationTemplatesService = {
    findById: jest.fn(),
  };
  const dispatcher = {
    send: jest.fn(),
  };

  const service = new NotificationDispatchPipelineService(
    notificationsService as any,
    eventLogsService as any,
    eventListenersService as any,
    eventNotificationRulesService as any,
    notificationLogsService as any,
    notificationChannelsService as any,
    userNotificationPreferenceService as any,
    templateEngine as any,
    platformFlags as any,
    platformEventFlags as any,
    notificationTemplatesService as any,
    dispatcher as any,
  );

  const eventLog = {
    logId: 26,
    userId: 9,
    eventId: 4,
    status: 0,
    payload: {
      ruleDispatch: { ruleId: 12, channelId: 1, templateId: 258 },
    },
    event: { name: 'six1-event.tenant_user_invited' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    platformEventFlags.isNotificationRulesEnabled.mockReturnValue(true);
    platformFlags.isImmediateDispatchEnabled.mockReturnValue(false);
    eventLogsService.findByIdForDispatch.mockResolvedValue(eventLog);
    eventLogsService.update.mockResolvedValue(undefined);
    notificationChannelsService.findById.mockResolvedValue({
      channelId: 1,
      name: 'email',
    });
  });

  it('marks the event log processed when the snapshot template is missing', async () => {
    notificationTemplatesService.findById.mockResolvedValue(null);

    await expect(service.processEventLog(26)).resolves.toEqual([]);

    expect(notificationTemplatesService.findById).toHaveBeenCalledWith(258);
    expect(notificationsService.create).not.toHaveBeenCalled();
    expect(eventLogsService.update).toHaveBeenCalledWith(9, 26, {
      logId: 26,
      status: 1,
    });
  });

  it('creates a notification when the snapshot template and channel exist', async () => {
    notificationTemplatesService.findById.mockResolvedValue({
      templateId: 258,
      subject: 'Invite',
      message: 'Hello {{recipient.name}}',
    });
    userNotificationPreferenceService.isChannelEnabled.mockResolvedValue(true);
    templateEngine.renderFromEventLog.mockResolvedValue({
      subject: 'Invite',
      message: 'Hello Bob',
      missingRequired: [],
    });
    notificationsService.create.mockResolvedValue({ notificationId: 99 });

    const created = await service.processEventLog(26);

    expect(created).toEqual([{ notificationId: 99 }]);
    expect(notificationsService.create).toHaveBeenCalled();
    expect(eventLogsService.update).toHaveBeenCalledWith(9, 26, {
      logId: 26,
      status: 1,
    });
  });
});
