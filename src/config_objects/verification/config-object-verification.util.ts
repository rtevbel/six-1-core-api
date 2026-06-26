import type { ConfigObjectEntity } from '../entities/config_object.entity';
import {
  DEFAULT_CONFIG_OBJECT_VERIFICATION_FIELD_MAP,
  type ConfigObjectVerificationFieldMap,
} from './config-object-verification.constants';
import { USER_SYSTEM_TABLE_VERIFICATION_FIELD_MAP } from './user-verification.constants';

function readNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readPositiveInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return Math.trunc(n);
}

/**
 * Parses persisted `verification_field_map` JSON from a config object row.
 */
export function parseConfigObjectVerificationFieldMap(
  raw: unknown,
): ConfigObjectVerificationFieldMap | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const tokenField = readNonEmptyString(record.tokenField);
  const expiresAtField = readNonEmptyString(record.expiresAtField);
  const verifiedField = readNonEmptyString(record.verifiedField);

  if (!tokenField || !expiresAtField || !verifiedField) {
    return null;
  }

  const defaultTtlHours = readPositiveInt(record.defaultTtlHours) ?? undefined;

  return {
    tokenField,
    expiresAtField,
    verifiedField,
    ...(defaultTtlHours != null ? { defaultTtlHours } : {}),
  };
}

/**
 * Resolves verification field mapping for a config object (persisted or default when enabled).
 */
export function resolveConfigObjectVerificationFieldMap(
  configObject: Pick<ConfigObjectEntity, 'verificationFieldMap'>,
): ConfigObjectVerificationFieldMap | null {
  const parsed = parseConfigObjectVerificationFieldMap(
    configObject.verificationFieldMap,
  );
  return parsed ?? null;
}

/**
 * Returns the effective map when verification is configured on the object.
 */
export function resolveEffectiveVerificationFieldMap(
  configObject: Pick<
    ConfigObjectEntity,
    'verificationFieldMap' | 'bindingMode' | 'objectType'
  >,
): ConfigObjectVerificationFieldMap {
  const parsed = resolveConfigObjectVerificationFieldMap(configObject);
  if (parsed) {
    return parsed;
  }
  if (
    configObject.bindingMode === 'system_table' &&
    configObject.objectType === 'user'
  ) {
    return USER_SYSTEM_TABLE_VERIFICATION_FIELD_MAP;
  }
  return DEFAULT_CONFIG_OBJECT_VERIFICATION_FIELD_MAP;
}
