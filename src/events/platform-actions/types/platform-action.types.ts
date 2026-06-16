import type { RecipientSpec } from '../../notification-rules/recipient-spec.types';

export type PlatformActionType = 'emit_event' | 'send_notification';

export interface EmitEventActionConfig {
  eventName: string;
  data?: Record<string, unknown>;
}

export interface SendNotificationActionConfig {
  channelId: number;
  templateId: number;
  recipientSpec: RecipientSpec;
}

export type PlatformActionConfig =
  | EmitEventActionConfig
  | SendNotificationActionConfig;

export function parseEmitEventActionConfig(
  raw: unknown,
): EmitEventActionConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const config = raw as Record<string, unknown>;
  if (typeof config.eventName !== 'string' || !config.eventName.trim()) {
    return null;
  }
  return {
    eventName: config.eventName.trim(),
    ...(config.data && typeof config.data === 'object' && !Array.isArray(config.data)
      ? { data: config.data as Record<string, unknown> }
      : {}),
  };
}

export function parseSendNotificationActionConfig(
  raw: unknown,
): SendNotificationActionConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const config = raw as Record<string, unknown>;
  const channelId = Number(config.channelId);
  const templateId = Number(config.templateId);
  if (!Number.isFinite(channelId) || !Number.isFinite(templateId)) {
    return null;
  }
  if (!config.recipientSpec || typeof config.recipientSpec !== 'object') {
    return null;
  }
  return {
    channelId,
    templateId,
    recipientSpec: config.recipientSpec as RecipientSpec,
  };
}
