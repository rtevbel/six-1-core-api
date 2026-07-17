import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { StorageService } from './storage.service';
import {
  buildMediaPath,
  type MediaOwnership,
} from './media-ownership';
import { MediaErrorCode } from './media-error-codes';
import {
  assertCallerMayAccessPath,
  assertCallerMayWriteOwnership,
  type MediaCallerContext,
} from './media-acl';
import type { MediaRef } from '../config_objects/field-validation';
import {
  STORAGE_DEFAULT_MAX_BYTES,
  STORAGE_PRESIGN_TTL_SECONDS,
} from '../common/constants';

export interface StartMediaUploadInput {
  filename: string;
  contentType?: string;
  ownership: MediaOwnership;
  accept?: string;
  maxSizeBytes?: number;
  expiresIn?: number;
  bucket?: string;
  caller: MediaCallerContext;
}

export interface ConfirmMediaUploadInput {
  path: string;
  bucket?: string;
  filename?: string;
  caller: MediaCallerContext;
}

export interface PresignMediaDownloadInput {
  path: string;
  bucket?: string;
  expiresIn?: number;
  disposition?: 'inline' | 'attachment';
  downloadName?: string;
  caller: MediaCallerContext;
}

export interface DeleteMediaPathsInput {
  path?: string;
  paths?: string[];
  bucket?: string;
  caller?: MediaCallerContext;
}

/**
 * Application-layer media API: ownership paths, validation hints, lifecycle.
 * Delegates binary I/O to {@link StorageService} / {@link IStorageProvider}.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  get driver(): string {
    return this.storage.driver;
  }

  defaultMaxBytes(): number {
    return this.config.get<number>(STORAGE_DEFAULT_MAX_BYTES, 25 * 1024 * 1024);
  }

  defaultPresignTtlSeconds(): number {
    return this.config.get<number>(STORAGE_PRESIGN_TTL_SECONDS, 15 * 60);
  }

  /**
   * Allocate a path and return a presigned PUT URL.
   */
  async startUpload(input: StartMediaUploadInput): Promise<{
    path: string;
    uploadUrl: string;
    expiresIn: number;
    driver: string;
  }> {
    assertCallerMayWriteOwnership(input.ownership, input.caller);
    this.assertContentTypeAllowed(input.contentType, input.accept);

    let path: string;
    try {
      path = buildMediaPath({
        ownership: input.ownership,
        filename: input.filename,
      });
    } catch (err) {
      throw new RpcException({
        code: MediaErrorCode.InvalidOwnership,
        message: err instanceof Error ? err.message : 'Invalid media ownership',
      });
    }

    const expiresIn = input.expiresIn ?? this.defaultPresignTtlSeconds();

    try {
      const { url } = await this.storage.presignUpload({
        key: path,
        bucket: input.bucket,
        contentType: input.contentType,
        expiresIn,
      });
      return { path, uploadUrl: url, expiresIn, driver: this.driver };
    } catch (err) {
      this.logger.error('Media startUpload cloud failure', err);
      throw new RpcException({
        code: MediaErrorCode.CloudFailure,
        message: 'Failed to create upload URL',
      });
    }
  }

  /**
   * Verify object exists and return a MediaRef for persistence.
   */
  async confirmUpload(input: ConfirmMediaUploadInput): Promise<MediaRef & {
    driver: string;
    etag?: string | null;
    lastModified?: Date | null;
  }> {
    this.assertValidPath(input.path);
    assertCallerMayAccessPath(input.path, input.caller);

    let meta;
    try {
      meta = await this.storage.head(input.bucket, input.path);
    } catch (err) {
      this.logger.error('Media confirmUpload HEAD failed', err);
      throw new RpcException({
        code: MediaErrorCode.CloudFailure,
        message: 'Failed to verify uploaded object',
      });
    }

    if (!meta.exists) {
      throw new RpcException({
        code: MediaErrorCode.NotFound,
        message: 'Uploaded object not found',
      });
    }

    const sizeBytes = meta.contentLength ?? undefined;
    const maxBytes = this.defaultMaxBytes();
    if (sizeBytes != null && sizeBytes > maxBytes) {
      try {
        await this.storage.remove({ key: input.path, bucket: input.bucket });
      } catch {
        this.logger.warn(`Failed to delete oversized object ${input.path}`);
      }
      throw new RpcException({
        code: MediaErrorCode.TooLarge,
        message: `File exceeds max size of ${maxBytes} bytes`,
      });
    }

    const ref: MediaRef & {
      driver: string;
      etag?: string | null;
      lastModified?: Date | null;
    } = {
      path: input.path,
      driver: this.driver,
      etag: meta.etag,
      lastModified: meta.lastModified ?? null,
    };
    if (input.filename) {
      ref.filename = input.filename;
    }
    if (meta.contentType) {
      ref.contentType = meta.contentType;
    }
    if (sizeBytes != null) {
      ref.sizeBytes = sizeBytes;
    }
    return ref;
  }

  async presignDownload(input: PresignMediaDownloadInput): Promise<{
    url: string;
    expiresIn: number;
    driver: string;
  }> {
    this.assertValidPath(input.path);
    assertCallerMayAccessPath(input.path, input.caller);
    const expiresIn = input.expiresIn ?? 5 * 60;
    const inline = input.disposition === 'inline';

    try {
      return await this.storage.getPresignedDownloadUrl({
        key: input.path,
        bucket: input.bucket,
        expiresIn,
        inline,
        downloadName: input.downloadName,
      });
    } catch (err) {
      this.logger.error('Media presignDownload failed', err);
      throw new RpcException({
        code: MediaErrorCode.CloudFailure,
        message: 'Failed to create download URL',
      });
    }
  }

  async deletePaths(input: DeleteMediaPathsInput): Promise<{ deleted: string[] }> {
    const paths = [
      ...(input.path ? [input.path] : []),
      ...(input.paths ?? []),
    ].filter((p) => typeof p === 'string' && p.trim());

    if (paths.length === 0) {
      throw new RpcException({
        code: MediaErrorCode.InvalidPath,
        message: 'At least one path is required',
      });
    }

    const deleted: string[] = [];
    for (const path of paths) {
      this.assertValidPath(path);
      if (input.caller) {
        assertCallerMayAccessPath(path, input.caller);
      }
      try {
        await this.storage.remove({ key: path, bucket: input.bucket });
        deleted.push(path);
      } catch (err) {
        this.logger.error(`Media delete failed for ${path}`, err);
        throw new RpcException({
          code: MediaErrorCode.CloudFailure,
          message: `Failed to delete ${path}`,
        });
      }
    }
    return { deleted };
  }

  /**
   * Best-effort delete of paths removed during a field replace.
   */
  async deleteRemovedPaths(
    previous: string[],
    next: string[],
    bucket?: string,
  ): Promise<void> {
    const nextSet = new Set(next);
    const toDelete = previous.filter((p) => p && !nextSet.has(p));
    if (toDelete.length === 0) {
      return;
    }
    try {
      await this.deletePaths({ paths: toDelete, bucket });
    } catch (err) {
      this.logger.warn(
        `Replace cleanup failed for ${toDelete.length} path(s)`,
        err,
      );
    }
  }

  private assertValidPath(path: string): void {
    if (!path || typeof path !== 'string' || !path.trim()) {
      throw new RpcException({
        code: MediaErrorCode.InvalidPath,
        message: 'path is required',
      });
    }
    if (path.includes('..') || path.startsWith('/')) {
      throw new RpcException({
        code: MediaErrorCode.InvalidPath,
        message: 'path format is invalid',
      });
    }
    if (path.length > 512) {
      throw new RpcException({
        code: MediaErrorCode.InvalidPath,
        message: 'path exceeds max length',
      });
    }
  }

  /**
   * Lightweight accept check when contentType is known at start.
   * Full enforcement happens on confirm when size is known.
   */
  private assertContentTypeAllowed(
    contentType: string | undefined,
    accept: string | undefined,
  ): void {
    if (!contentType || !accept?.trim()) {
      return;
    }
    const tokens = accept
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (tokens.length === 0) {
      return;
    }
    const ct = contentType.toLowerCase().split(';')[0].trim();
    const ok = tokens.some((token) => {
      if (token === '*/*') return true;
      if (token.endsWith('/*')) {
        const prefix = token.slice(0, -1);
        return ct.startsWith(prefix);
      }
      if (token.startsWith('.')) {
        return false;
      }
      return token === ct;
    });
    if (!ok && !tokens.every((t) => t.startsWith('.'))) {
      throw new RpcException({
        code: MediaErrorCode.TypeNotAllowed,
        message: `contentType ${contentType} is not allowed by accept`,
      });
    }
  }
}
