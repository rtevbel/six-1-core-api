import { Readable } from 'stream';

/**
 * Input type for uploading a file.
 */
export type PutInput = {
  bucket?: string; // Optional bucket name.
  key: string; // The key (path) where the file will be stored.
  body: Buffer | Uint8Array | Blob | string | Readable; // File content.
  contentType?: string; // Optional MIME type of the file.
  cacheControl?: string; // Optional cache control header.
};

/**
 * Input type for generating a presigned URL for uploading a file.
 */
export type PresignUploadInput = {
  bucket?: string; // Optional bucket name.
  key: string; // The key (path) where the file will be uploaded.
  contentType?: string; // Optional MIME type of the file.
  expiresIn?: number; // Optional expiration time for the presigned URL (in seconds).
  acl?: 'private' | 'public-read'; // Optional access control list.
  metadata?: Record<string, string>; // Optional metadata to attach to the file.
};

/**
 * Input type for generating a presigned URL for downloading a file.
 */
export type PresignGetInput = {
  bucket?: string; // Optional bucket name.
  key: string; // The key (path) of the file to download.
  expiresIn?: number; // Optional expiration time for the presigned URL (in seconds).
  responseContentType?: string; // Optional content type for the response.
  responseContentDisposition?: string; // Optional content disposition (e.g., 'attachment; filename="file.pdf"').
};

/**
 * Output type for fetching metadata about a file.
 */
export type HeadOutput = {
  contentLength: number | null; // File size in bytes (or null if unavailable).
  contentType: string | null; // MIME type of the file (or null if unavailable).
  etag: string | null; // Entity tag (ETag) of the file (or null if unavailable).
  lastModified: Date | null; // Last modified date of the file (or null if unavailable).
  metadata: Record<string, string>; // Metadata attached to the file.
  exists: boolean; // Indicates whether the file exists.
};

/**
 * Output type for creating a multipart upload.
 */
export interface MultipartCreateOutput {
  uploadId: string; // Unique ID for the multipart upload.
}

/**
 * Represents a presigned URL for uploading a specific part of a multipart upload.
 */
export interface MultipartPartUrl {
  url: string; // Presigned URL for the part.
  partNumber: number; // Part number.
}

/**
 * Interface for a storage provider.
 * Defines the contract for implementing storage operations.
 */
export interface IStorageProvider {
  driver: string; // Identifier for the storage provider (e.g., "s3", "r2").

  /**
   * Uploads a file.
   * @param input - Input parameters for the upload.
   * @returns A promise resolving to the uploaded file's key.
   */
  put(input: PutInput): Promise<{ key: string }>;

  /**
   * Deletes a file.
   * @param bucket - The bucket name.
   * @param key - The key (path) of the file to delete.
   */
  delete(bucket: string, key: string): Promise<void>;

  /**
   * Fetches metadata about a file.
   * @param bucket - The bucket name.
   * @param key - The key (path) of the file.
   * @returns A promise resolving to the file's metadata.
   */
  head(bucket: string, key: string): Promise<HeadOutput>;

  /**
   * Generates a presigned URL for uploading a file.
   * @param input - Input parameters for the presigned upload.
   * @returns A promise resolving to the presigned URL and additional fields.
   */
  presignUpload(
    input: PresignUploadInput,
  ): Promise<{ url: string; fields?: Record<string, string>; key: string }>;

  /**
   * Generates a presigned URL for downloading a file.
   * @param input - Input parameters for the presigned download.
   * @returns A promise resolving to the presigned URL.
   */
  presignGet(input: PresignGetInput): Promise<{ url: string }>;

  /**
   * Lists files in a bucket with a given prefix.
   * @param bucket - The bucket name.
   * @param prefix - The prefix to filter files.
   * @param maxKeys - Optional maximum number of keys to return.
   * @returns A promise resolving to the list of file keys.
   */
  list(
    bucket: string,
    prefix: string,
    maxKeys?: number,
  ): Promise<{ keys: string[] }>;

  /**
   * Initiates a multipart upload.
   * @param bucket - The bucket name.
   * @param key - The key (path) for the file.
   * @param contentType - Optional MIME type of the file.
   * @returns A promise resolving to the multipart upload ID.
   */
  createMultipart(
    bucket: string,
    key: string,
    contentType?: string,
  ): Promise<MultipartCreateOutput>;

  /**
   * Generates a presigned URL for uploading a specific part of a multipart upload.
   * @param bucket - The bucket name.
   * @param key - The key (path) for the file.
   * @param uploadId - The multipart upload ID.
   * @param partNumber - The part number.
   * @returns A promise resolving to the presigned URL for the part.
   */
  presignUploadPart(
    bucket: string,
    key: string,
    uploadId: string,
    partNumber: number,
  ): Promise<MultipartPartUrl>;

  /**
   * Completes a multipart upload.
   * @param bucket - The bucket name.
   * @param key - The key (path) for the file.
   * @param uploadId - The multipart upload ID.
   * @param parts - The list of uploaded parts with their ETags and part numbers.
   */
  completeMultipart(
    bucket: string,
    key: string,
    uploadId: string,
    parts: Array<{ ETag: string; PartNumber: number }>,
  ): Promise<void>;

  /**
   * Aborts a multipart upload.
   * @param bucket - The bucket name.
   * @param key - The key (path) for the file.
   * @param uploadId - The multipart upload ID.
   */
  abortMultipart(bucket: string, key: string, uploadId: string): Promise<void>;
}
