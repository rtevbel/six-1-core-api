import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  IStorageProvider,
  PutInput,
  PresignUploadInput,
  PresignGetInput,
  HeadOutput,
  MultipartCreateOutput,
  MultipartPartUrl,
} from '../interfaces/storage-provider.interface';

/**
 * LocalProvider is a storage provider implementation for local file storage.
 * It provides methods for uploading, downloading, and managing files locally.
 */
export class LocalProvider implements IStorageProvider {
  public readonly driver = 'local'; // Identifier for the storage driver
  private baseDir: string; // Base directory for storing files
  private publicBaseUrl?: string; // Public base URL for accessing files (e.g., http://localhost:4000/static)

  constructor(opts: { baseDir: string; publicBaseUrl?: string }) {
    this.baseDir = opts.baseDir;
    this.publicBaseUrl = opts.publicBaseUrl;
  }

  /**
   * Constructs the full path for a given key.
   * @param key - The key (path) of the file.
   * @returns The full path of the file.
   */
  private fullPath(key: string) {
    return path.join(this.baseDir, key);
  }

  /**
   * Uploads a file to the local storage.
   * @param input - The input containing the file key and body.
   * @returns The key of the uploaded file.
   */
  async put(input: PutInput) {
    const p = this.fullPath(input.key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    const buf = Buffer.isBuffer(input.body)
      ? input.body
      : Buffer.from(input.body as any);
    await fs.writeFile(p, buf);
    return { key: input.key };
  }

  /**
   * Deletes a file from the local storage.
   * @param _bucket - The bucket name (not used in local storage).
   * @param key - The key (path) of the file to delete.
   */
  async delete(_bucket: string, key: string) {
    const p = this.fullPath(key);
    await fs.rm(p, { force: true });
  }

  /**
   * Retrieves metadata about a file.
   * @param _bucket - The bucket name (not used in local storage).
   * @param key - The key (path) of the file.
   * @returns Metadata about the file.
   */
  async head(_bucket: string, key: string): Promise<HeadOutput> {
    const p = this.fullPath(key);
    try {
      const st = await fs.stat(p);
      return {
        contentLength: st.size,
        contentType: null,
        etag: crypto.createHash('md5').update(p).digest('hex'),
        lastModified: st.mtime,
        metadata: {},
        exists: true,
      };
    } catch {
      return {
        contentLength: null,
        contentType: null,
        etag: null,
        lastModified: null,
        metadata: {},
        exists: false,
      };
    }
  }

  /**
   * Generates a presigned URL for uploading a file.
   * @param input - The input containing the file key.
   * @returns A presigned URL for uploading the file.
   */
  async presignUpload(input: PresignUploadInput) {
    const url = `${this.publicBaseUrl ?? 'http://localhost:3000'}/dev-upload/${encodeURIComponent(input.key)}`;
    return { url, key: input.key };
  }

  /**
   * Generates a presigned URL for downloading a file.
   * @param input - The input containing the file key.
   * @returns A presigned URL for downloading the file.
   */
  async presignGet(input: PresignGetInput) {
    if (!this.publicBaseUrl) {
      return { url: `file://${this.fullPath(input.key)}` };
    }
    return { url: `${this.publicBaseUrl}/${encodeURIComponent(input.key)}` };
  }

  /**
   * Lists all files under a given prefix.
   * @param _bucket - The bucket name (not used in local storage).
   * @param prefix - The prefix to list files under.
   * @returns A list of file keys.
   */
  async list(_bucket: string, prefix: string) {
    const dir = this.fullPath(prefix);
    const out: string[] = [];
    async function walk(d: string, base: string) {
      let entries: any[] = [];
      try {
        entries = await fs.readdir(d, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const p = path.join(d, e.name);
        const rel = path.relative(base, p);
        if (e.isDirectory()) await walk(p, base);
        else out.push(rel.replaceAll('\\', '/'));
      }
    }
    await walk(dir, this.baseDir);
    return { keys: out.map((k) => `${prefix}/${k}`.replace(/\/+/g, '/')) };
  }

  /**
   * Creates a multipart upload (no-op for local storage).
   * @returns A dummy upload ID.
   */
  async createMultipart(): Promise<MultipartCreateOutput> {
    return { uploadId: 'local' };
  }

  /**
   * Generates a presigned URL for uploading a part of a multipart upload.
   * @param _b - The bucket name (not used in local storage).
   * @param _k - The key (path) of the file.
   * @param _u - The upload ID.
   * @param partNumber - The part number.
   * @returns A presigned URL for uploading the part.
   */
  async presignUploadPart(
    _b: string,
    _k: string,
    _u: string,
    partNumber: number,
  ): Promise<MultipartPartUrl> {
    return {
      url: `${this.publicBaseUrl ?? ''}/dev-upload/part/${partNumber}`,
      partNumber,
    };
  }

  /**
   * Completes a multipart upload (no-op for local storage).
   */
  async completeMultipart(): Promise<void> {
    return;
  }

  /**
   * Aborts a multipart upload (no-op for local storage).
   */
  async abortMultipart(): Promise<void> {
    return;
  }
}
