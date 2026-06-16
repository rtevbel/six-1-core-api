import { ConfigService } from '@nestjs/config';
import { parseProcessFeatureFlag } from './process-feature.config';
import {
  DEFAULT_PROCESS_STEP_WEBHOOK_TIMEOUT_MS,
  PROCESS_STEP_WEBHOOK_ALLOWED_HOST_SUFFIXES_KEY,
  PROCESS_STEP_WEBHOOK_DEFAULT_TIMEOUT_MS_KEY,
  PROCESS_STEP_WEBHOOK_ENABLED_KEY,
} from './process-webhook.constants';

export interface ProcessWebhookSettings {
  enabled: boolean;
  defaultTimeoutMs: number;
  allowedHostSuffixes: string[];
}

function parseTimeoutMs(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PROCESS_STEP_WEBHOOK_TIMEOUT_MS;
  }
  return Math.min(Math.trunc(parsed), 120_000);
}

function parseHostSuffixes(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function loadProcessWebhookSettings(
  configService: ConfigService,
): ProcessWebhookSettings {
  return {
    enabled: parseProcessFeatureFlag(
      configService.get<string>(PROCESS_STEP_WEBHOOK_ENABLED_KEY),
    ),
    defaultTimeoutMs: parseTimeoutMs(
      configService.get<string>(PROCESS_STEP_WEBHOOK_DEFAULT_TIMEOUT_MS_KEY),
    ),
    allowedHostSuffixes: parseHostSuffixes(
      configService.get<string>(PROCESS_STEP_WEBHOOK_ALLOWED_HOST_SUFFIXES_KEY),
    ),
  };
}
