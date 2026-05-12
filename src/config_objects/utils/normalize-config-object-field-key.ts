import { RpcException } from '@nestjs/microservices';

/** Matches persisted `config_object_fields.field_key` (varchar 100): snake-style lowercase identifier. */
const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

const MAX_FIELD_KEY_LENGTH = 100;

/**
 * Normalizes inbound custom field keys: trim, lowercase, runs of whitespace → single underscore.
 */
export function normalizeConfigObjectFieldKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Ensures a normalized key is safe to persist (identifier rules + DB length).
 */
export function assertPersistableConfigObjectFieldKey(fieldKey: string): void {
  if (!fieldKey.length) {
    throw new RpcException(
      'field_key cannot be empty after trimming and normalization.',
    );
  }
  if (fieldKey.length > MAX_FIELD_KEY_LENGTH) {
    throw new RpcException(
      `field_key exceeds maximum length of ${MAX_FIELD_KEY_LENGTH} characters.`,
    );
  }
  if (!FIELD_KEY_PATTERN.test(fieldKey)) {
    throw new RpcException(
      'field_key must be a lowercase identifier: start with a letter, then only letters, digits, or underscores. Replace spaces before sending or rely on automatic normalization.',
    );
  }
}
