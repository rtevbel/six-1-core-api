import {
  parseEmitEventActionConfig,
  parseSendNotificationActionConfig,
} from './platform-action.types';

describe('platform-action.types', () => {
  describe('parseEmitEventActionConfig', () => {
    it('parses valid emit_event config', () => {
      expect(
        parseEmitEventActionConfig({
          eventName: 'six1-event.tenant.created',
          data: { foo: 'bar' },
        }),
      ).toEqual({
        eventName: 'six1-event.tenant.created',
        data: { foo: 'bar' },
      });
    });

    it('rejects missing eventName', () => {
      expect(parseEmitEventActionConfig({})).toBeNull();
    });
  });

  describe('parseSendNotificationActionConfig', () => {
    it('parses valid send_notification config', () => {
      expect(
        parseSendNotificationActionConfig({
          channelId: 1,
          templateId: 2,
          recipientSpec: { type: 'tenant_admins' },
        }),
      ).toEqual({
        channelId: 1,
        templateId: 2,
        recipientSpec: { type: 'tenant_admins' },
      });
    });

    it('rejects incomplete config', () => {
      expect(
        parseSendNotificationActionConfig({ channelId: 1 }),
      ).toBeNull();
    });
  });
});
