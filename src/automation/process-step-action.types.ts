import type {
  EmitEventActionConfig,
  SendNotificationActionConfig,
} from '../events/platform-actions/types/platform-action.types';
import {
  parseEmitEventActionConfig,
  parseSendNotificationActionConfig,
} from '../events/platform-actions/types/platform-action.types';
import {
  PROCESS_STEP_ACTION_TYPE_CALL_WEBHOOK,
  PROCESS_STEP_ACTION_TYPE_EMIT_EVENT,
  PROCESS_STEP_ACTION_TYPE_GENERATE_VERIFICATION_TOKEN,
  PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION,
  PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
  type ProcessStepActionType,
} from './process-step-action.constants';

/** Patch an existing SoR / system_table row (delegates to ConfigObjectsService in C4). */
export interface UpdateSorFieldActionConfig {
  objectType: string;
  /** Dot-path on merged process context, e.g. `entity.coreId` or `context.customerId`. */
  coreIdPath: string;
  corePatch?: Record<string, unknown>;
  metaPatch?: Record<string, unknown>;
}

/** Outbound HTTP call (C6 — {@link ProcessStepWebhookClient}). */
export interface CallWebhookActionConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  timeoutMs?: number;
}

/** Issues email verification token meta on a sor_bound config object (Phase 2). */
export interface GenerateVerificationTokenActionConfig {
  objectType: string;
  /** Dot-path on merged process runtime context, e.g. `context.customerId`. */
  coreIdPath: string;
  tokenField?: string;
  expiresAtField?: string;
  verifiedField?: string;
  ttlHours?: number;
  /** When true (default), sets verified field to false before issuing a new token. */
  clearVerifiedBeforeIssue?: boolean;
}

export type ProcessStepActionConfig =
  | EmitEventActionConfig
  | SendNotificationActionConfig
  | UpdateSorFieldActionConfig
  | CallWebhookActionConfig
  | GenerateVerificationTokenActionConfig;

export function parseUpdateSorFieldActionConfig(
  raw: unknown,
): UpdateSorFieldActionConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const config = raw as Record<string, unknown>;
  if (typeof config.objectType !== 'string' || !config.objectType.trim()) {
    return null;
  }
  if (typeof config.coreIdPath !== 'string' || !config.coreIdPath.trim()) {
    return null;
  }

  return {
    objectType: config.objectType.trim(),
    coreIdPath: config.coreIdPath.trim(),
    ...(config.corePatch &&
    typeof config.corePatch === 'object' &&
    !Array.isArray(config.corePatch)
      ? { corePatch: config.corePatch as Record<string, unknown> }
      : {}),
    ...(config.metaPatch &&
    typeof config.metaPatch === 'object' &&
    !Array.isArray(config.metaPatch)
      ? { metaPatch: config.metaPatch as Record<string, unknown> }
      : {}),
  };
}

export function parseCallWebhookActionConfig(
  raw: unknown,
): CallWebhookActionConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const config = raw as Record<string, unknown>;
  if (typeof config.url !== 'string' || !config.url.trim()) {
    return null;
  }

  const method = config.method;
  const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
  const parsedMethod =
    typeof method === 'string' &&
    (allowedMethods as readonly string[]).includes(method)
      ? (method as CallWebhookActionConfig['method'])
      : 'POST';

  const timeoutMs = Number(config.timeoutMs);
  return {
    url: config.url.trim(),
    method: parsedMethod,
    ...(config.headers &&
    typeof config.headers === 'object' &&
    !Array.isArray(config.headers)
      ? { headers: config.headers as Record<string, string> }
      : {}),
    ...(config.body &&
    typeof config.body === 'object' &&
    !Array.isArray(config.body)
      ? { body: config.body as Record<string, unknown> }
      : {}),
    ...(Number.isFinite(timeoutMs) && timeoutMs > 0 ? { timeoutMs } : {}),
  };
}

export function parseGenerateVerificationTokenActionConfig(
  raw: unknown,
): GenerateVerificationTokenActionConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const config = raw as Record<string, unknown>;
  if (typeof config.objectType !== 'string' || !config.objectType.trim()) {
    return null;
  }
  if (typeof config.coreIdPath !== 'string' || !config.coreIdPath.trim()) {
    return null;
  }

  const ttlHours = Number(config.ttlHours);
  const parsedTtl =
    Number.isFinite(ttlHours) && ttlHours > 0 ? Math.trunc(ttlHours) : undefined;

  const readOptionalFieldKey = (value: unknown): string | undefined => {
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }
    return value.trim();
  };

  return {
    objectType: config.objectType.trim(),
    coreIdPath: config.coreIdPath.trim(),
    ...(readOptionalFieldKey(config.tokenField)
      ? { tokenField: readOptionalFieldKey(config.tokenField) }
      : {}),
    ...(readOptionalFieldKey(config.expiresAtField)
      ? { expiresAtField: readOptionalFieldKey(config.expiresAtField) }
      : {}),
    ...(readOptionalFieldKey(config.verifiedField)
      ? { verifiedField: readOptionalFieldKey(config.verifiedField) }
      : {}),
    ...(parsedTtl != null ? { ttlHours: parsedTtl } : {}),
    ...(typeof config.clearVerifiedBeforeIssue === 'boolean'
      ? { clearVerifiedBeforeIssue: config.clearVerifiedBeforeIssue }
      : {}),
  };
}

/**
 * Validates `config` JSON for a template/instance step action row.
 */
export function parseProcessStepActionConfig(
  actionType: ProcessStepActionType,
  raw: unknown,
): ProcessStepActionConfig | null {
  switch (actionType) {
    case PROCESS_STEP_ACTION_TYPE_EMIT_EVENT:
      return parseEmitEventActionConfig(raw);
    case PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION:
      return parseSendNotificationActionConfig(raw);
    case PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD:
      return parseUpdateSorFieldActionConfig(raw);
    case PROCESS_STEP_ACTION_TYPE_CALL_WEBHOOK:
      return parseCallWebhookActionConfig(raw);
    case PROCESS_STEP_ACTION_TYPE_GENERATE_VERIFICATION_TOKEN:
      return parseGenerateVerificationTokenActionConfig(raw);
    default:
      return null;
  }
}
