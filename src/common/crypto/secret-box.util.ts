import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface SecretBoxPayload {
  v: 1;
  iv: string;
  tag: string;
  ciphertext: string;
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

/**
 * Parse a 32-byte key from base64 or hex env string.
 */
export function parseSecretBoxKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('SYSTEM_SETTINGS_ENCRYPTION_KEY is empty.');
  }

  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    key = Buffer.from(trimmed, 'hex');
  } else {
    key = Buffer.from(trimmed, 'base64');
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `SYSTEM_SETTINGS_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes.`,
    );
  }
  return key;
}

/**
 * Encrypt plaintext with AES-256-GCM.
 */
export function encryptSecretBox(
  plaintext: string,
  key: Buffer,
): SecretBoxPayload {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };
}

/**
 * Decrypt an AES-256-GCM secret box payload.
 */
export function decryptSecretBox(
  payload: SecretBoxPayload,
  key: Buffer,
): string {
  if (payload.v !== 1) {
    throw new Error(`Unsupported secret box version: ${payload.v}`);
  }
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function isSecretBoxPayload(value: unknown): value is SecretBoxPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    obj.v === 1 &&
    typeof obj.iv === 'string' &&
    typeof obj.tag === 'string' &&
    typeof obj.ciphertext === 'string'
  );
}
