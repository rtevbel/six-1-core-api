import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  decryptSecretBox,
  encryptSecretBox,
  isSecretBoxPayload,
  parseSecretBoxKey,
  SecretBoxPayload,
} from '../../common/crypto/secret-box.util';
import { SYSTEM_SETTINGS_ENCRYPTION_KEY } from './constants';

/**
 * Encrypts/decrypts system setting secret values using AES-256-GCM.
 */
@Injectable()
export class SecretEncryptionService implements OnModuleInit {
  private readonly logger = new Logger(SecretEncryptionService.name);
  private key: Buffer | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const raw = this.configService.get<string>(SYSTEM_SETTINGS_ENCRYPTION_KEY);
    if (!raw) {
      this.logger.warn(
        `${SYSTEM_SETTINGS_ENCRYPTION_KEY} is not set; secret setting writes will fail until configured.`,
      );
      return;
    }
    try {
      this.key = parseSecretBoxKey(raw);
    } catch (err) {
      this.logger.error(
        `Invalid ${SYSTEM_SETTINGS_ENCRYPTION_KEY}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  encrypt(plaintext: string): SecretBoxPayload {
    return encryptSecretBox(plaintext, this.requireKey());
  }

  decrypt(payload: SecretBoxPayload | unknown): string {
    if (!isSecretBoxPayload(payload)) {
      throw new Error('Invalid encrypted secret payload.');
    }
    return decryptSecretBox(payload, this.requireKey());
  }

  private requireKey(): Buffer {
    if (!this.key) {
      throw new Error(
        `${SYSTEM_SETTINGS_ENCRYPTION_KEY} is required to handle secret settings.`,
      );
    }
    return this.key;
  }
}
