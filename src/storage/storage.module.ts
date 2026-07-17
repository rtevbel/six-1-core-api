// src/storage/storage.module.ts
import { Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER } from './constants';
import { StorageService } from './storage.service';
import { MediaService } from './media.service';
import { StorageController } from './storage.controller';
import { R2Provider } from './providers/r2.provider';
import { S3Provider } from './providers/s3.provider';
import { LocalProvider } from './providers/local.provider';
import {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  S3_REGION,
  S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY,
  S3_BUCKET,
  LOCAL_STORAGE_DIR,
  LOCAL_PUBLIC_BASE_URL,
  STORAGE_DRIVER,
} from '../common/constants';

/**
 * Factory provider to dynamically create the appropriate storage provider
 * based on the `STORAGE_DRIVER` configuration.
 */
const providerFactory: Provider = {
  provide: STORAGE_PROVIDER,
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => {
    const driver = cfg.get<string>(STORAGE_DRIVER, 'r2'); // Default to "r2" if not specified.

    // R2 storage provider
    if (driver === 'r2') {
      return new R2Provider({
        accountId: cfg.getOrThrow(R2_ACCOUNT_ID), // R2 account ID.
        accessKeyId: cfg.getOrThrow(R2_ACCESS_KEY_ID), // R2 access key ID.
        secretAccessKey: cfg.getOrThrow(R2_SECRET_ACCESS_KEY), // R2 secret access key.
        bucket: cfg.getOrThrow(R2_BUCKET), // R2 bucket name.
      });
    }

    // S3 storage provider
    if (driver === 's3') {
      return new S3Provider({
        region: cfg.getOrThrow(S3_REGION), // S3 region.
        accessKeyId: cfg.getOrThrow(S3_ACCESS_KEY_ID), // S3 access key ID.
        secretAccessKey: cfg.getOrThrow(S3_SECRET_ACCESS_KEY), // S3 secret access key.
        bucket: cfg.getOrThrow(S3_BUCKET), // S3 bucket name.
      });
    }

    // Default to local storage provider when the driver is not r2 or s3.
    return new LocalProvider({
      baseDir: cfg.get<string>(LOCAL_STORAGE_DIR, 'storage'), // Base directory for local storage.
      publicBaseUrl: cfg.get<string>(
        LOCAL_PUBLIC_BASE_URL,
        'http://localhost:3000/static',
      ), // Public base URL for accessing files.
    });
  },
};

/**
 * Storage module to manage storage providers and services.
 */
@Module({
  imports: [ConfigModule],
  providers: [providerFactory, StorageService, MediaService],
  exports: [StorageService, MediaService, providerFactory],
  controllers: [StorageController],
})
export class StorageModule {}
