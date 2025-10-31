import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';
import { STORAGE_PROVIDER } from './constants';
import {
  IStorageProvider,
  PresignUploadInput,
  PresignGetInput,
  PutInput,
  HeadOutput,
} from './interfaces/storage-provider.interface';

type StartDirectUploadInput = {
  filename: string;
  contentType?: string;
  tenantId?: string;
  userId?: string;
  prefix?: string; // e.g. "attachments" | "avatars"
  bucket?: string;
  expiresIn?: number; // seconds for presigned PUT
};

type ConfirmDirectUploadInput = {
  key: string;
  bucket?: string;
};

type GetPresignedDownloadUrlInput = {
  key: string;
  bucket?: string;
  expiresIn?: number; // seconds for presigned GET
  inline?: boolean; // true = inline, false = attachment
  downloadName?: string; // filename in Content-Disposition
};

type GenerateKeyInput = {
  filename: string;
  tenantId?: string;
  userId?: string;
  prefix?: string;
};

/**
 * Service to interact with the storage provider.
 * This service acts as an abstraction layer over the underlying storage provider
 * and also provides a higher-level “direct upload” flow.
 */
@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_PROVIDER) private readonly provider: IStorageProvider,
  ) {}

  /** Get the driver name of the current storage provider. */
  get driver() {
    return this.provider.driver;
  }

  /** Upload a file (server-side). */
  async put(input: PutInput) {
    return this.provider.put(input);
  }

  /** Generate a presigned URL for uploading a file. */
  async presignUpload(input: PresignUploadInput) {
    return this.provider.presignUpload(input);
  }

  /** Generate a presigned URL for downloading a file. */
  async presignGet(input: PresignGetInput) {
    return this.provider.presignGet(input);
  }

  /** Delete a file. */
  async delete(bucket: string | undefined, key: string) {
    return this.provider.delete(bucket ?? (undefined as any), key);
  }

  /** Get metadata about a file. */
  async head(bucket: string | undefined, key: string): Promise<HeadOutput> {
    return this.provider.head(bucket ?? (undefined as any), key);
  }

  /** List files by prefix. */
  async list(bucket: string | undefined, prefix: string, maxKeys?: number) {
    return this.provider.list(bucket ?? (undefined as any), prefix, maxKeys);
  }

  /** Multipart: create session. */
  async createMultipart(
    bucket: string | undefined,
    key: string,
    contentType?: string,
  ) {
    return this.provider.createMultipart(
      bucket ?? (undefined as any),
      key,
      contentType,
    );
  }

  /** Multipart: presign one part. */
  async presignUploadPart(
    bucket: string | undefined,
    key: string,
    uploadId: string,
    partNumber: number,
  ) {
    return this.provider.presignUploadPart(
      bucket ?? (undefined as any),
      key,
      uploadId,
      partNumber,
    );
  }

  /** Multipart: complete session. */
  async completeMultipart(
    bucket: string | undefined,
    key: string,
    uploadId: string,
    parts: Array<{ ETag: string; PartNumber: number }>,
  ) {
    return this.provider.completeMultipart(
      bucket ?? (undefined as any),
      key,
      uploadId,
      parts,
    );
  }

  /** Multipart: abort session. */
  async abortMultipart(
    bucket: string | undefined,
    key: string,
    uploadId: string,
  ) {
    return this.provider.abortMultipart(
      bucket ?? (undefined as any),
      key,
      uploadId,
    );
  }

  /**
   * Build a canonical object key:
   * {tenantId}/{userId}/{prefix}/{uuid}.{ext}
   */
  generateKey({ filename, tenantId, userId, prefix }: GenerateKeyInput) {
    const ext =
      (path.extname(filename) || '').replace(/^\./, '').toLowerCase() || 'bin';
    const uuid = crypto.randomUUID();
    const parts = [
      tenantId?.trim(),
      userId?.trim(),
      prefix?.trim(),
      `${uuid}.${ext}`,
    ].filter(Boolean) as string[];
    return parts.join('/').replace(/\/+/g, '/');
  }

  /**
   * Step 1: Return a presigned PUT URL + canonical key for direct browser upload.
   */
  async startDirectUpload(input: StartDirectUploadInput) {
    const key = this.generateKey({
      filename: input.filename,
      tenantId: input.tenantId,
      userId: input.userId,
      prefix: input.prefix,
    });

    const { url } = await this.presignUpload({
      key,
      bucket: input.bucket,
      contentType: input.contentType,
      expiresIn: input.expiresIn ?? 15 * 60,
    });

    return { key, uploadUrl: url, driver: this.driver };
  }

  /**
   * Step 2: After client PUT, verify object exists and surface metadata.
   * (Persist this metadata to your DB in the controller/service that calls this.)
   */
  async confirmDirectUpload({ key, bucket }: ConfirmDirectUploadInput) {
    const meta = await this.head(bucket, key);
    if (!meta.exists) {
      // You may throw a custom exception type in your codebase.
      throw new Error('Uploaded object not found (HEAD 404).');
    }
    return {
      key,
      bucket: bucket ?? null,
      size: meta.contentLength,
      contentType: meta.contentType,
      etag: meta.etag,
      lastModified: meta.lastModified ?? null,
      driver: this.driver,
    };
  }

  /**
   * Generate a short-lived download URL (inline or attachment).
   */
  async getPresignedDownloadUrl({
    key,
    bucket,
    expiresIn = 5 * 60,
    inline = false,
    downloadName,
  }: GetPresignedDownloadUrlInput) {
    const dispType = inline ? 'inline' : 'attachment';
    const fallback = key.split('/').pop() ?? 'download';
    const safeName = (downloadName || fallback).replace(/"/g, '');

    const { url } = await this.presignGet({
      key,
      bucket,
      expiresIn,
      responseContentDisposition: `${dispType}; filename="${safeName}"`,
    });

    return { url, expiresIn, driver: this.driver };
  }

  /**
   * Server-side helper to upload a Buffer/Uint8Array and return the key.
   * Useful for webhooks, imports, or transformed files.
   */
  async putBuffer(params: {
    buffer: Buffer | Uint8Array;
    filename: string;
    contentType?: string;
    tenantId?: string;
    userId?: string;
    prefix?: string;
    bucket?: string;
    cacheControl?: string;
  }) {
    const key = this.generateKey({
      filename: params.filename,
      tenantId: params.tenantId,
      userId: params.userId,
      prefix: params.prefix,
    });

    await this.put({
      key,
      bucket: params.bucket,
      body: params.buffer,
      contentType: params.contentType,
      cacheControl: params.cacheControl,
    });

    return { key, driver: this.driver };
  }

  /**
   * Delete an object and (optionally) your DB record in the caller layer.
   */
  async remove(params: { key: string; bucket?: string }) {
    await this.delete(params.bucket, params.key);
    return { ok: true };
  }
}
