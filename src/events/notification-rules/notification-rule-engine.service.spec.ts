import { NotificationRuleEngineService } from './notification-rule-engine.service';
import type { EventEnvelope } from '../types';

describe('NotificationRuleEngineService', () => {
  const rulesService = {
    findActiveRulesForEvent: jest.fn(),
  };
  const recipientResolver = {
    resolve: jest.fn().mockResolvedValue([20]),
  };
  const dedup = {
    buildDispatchKey: jest.fn().mockReturnValue('20:9:corr-1'),
    hasRecentDispatch: jest.fn().mockResolvedValue(false),
  };
  const eventLogsService = {
    create: jest.fn(),
  };
  const catalog = {
    getIdByName: jest.fn().mockResolvedValue(9),
    resolveCanonicalEventName: jest.fn(),
  };
  const platformFlags = {
    isNotificationRulesEnabled: jest.fn().mockReturnValue(true),
  };
  const immediateDispatch = {
    enqueueFromEventLog: jest.fn(),
  };

  const engine = new NotificationRuleEngineService(
    rulesService as any,
    recipientResolver as any,
    dedup as any,
    eventLogsService as any,
    catalog as any,
    platformFlags as any,
    immediateDispatch as any,
  );

  const envelope: EventEnvelope = {
    eventName: 'six1-event.process_step_ready',
    tenantId: 5,
    correlationId: 'corr-1',
    entity: { entityType: 'ProcessStep', entityId: 1 },
    data: { processInstanceId: 10, stepInstanceId: 1, assigneeId: 20 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    recipientResolver.resolve.mockResolvedValue([20]);
    dedup.hasRecentDispatch.mockResolvedValue(false);
  });

  it('creates rule-dispatch event logs for matched rules', async () => {
    rulesService.findActiveRulesForEvent.mockResolvedValue([
      {
        ruleId: 3,
        channelId: 2,
        templateId: 4,
        recipientSpec: { type: 'assignee' },
        filterJson: null,
      },
    ]);
    eventLogsService.create.mockResolvedValue({ logId: 55 });

    await engine.process(envelope, { recordId: 100 } as any);

    expect(recipientResolver.resolve).toHaveBeenCalledWith(
      { type: 'assignee' },
      envelope,
    );
    expect(eventLogsService.create).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ userId: 20, eventId: 9 }),
      expect.objectContaining({
        ruleDispatch: { ruleId: 3, channelId: 2, templateId: 4 },
      }),
    );
    expect(immediateDispatch.enqueueFromEventLog).toHaveBeenCalledWith(55);
  });

  it('skips duplicate dispatches within the dedup window', async () => {
    rulesService.findActiveRulesForEvent.mockResolvedValue([
      {
        ruleId: 3,
        channelId: 2,
        templateId: 4,
        recipientSpec: { type: 'event_actor' },
        filterJson: null,
      },
    ]);
    dedup.hasRecentDispatch.mockResolvedValue(true);

    await engine.process(envelope, { recordId: 100 } as any);

    expect(eventLogsService.create).not.toHaveBeenCalled();
  });

  it('skips when rules flag is disabled', () => {
    platformFlags.isNotificationRulesEnabled.mockReturnValue(false);
    expect(engine.canHandle(envelope)).toBe(false);
  });
});
