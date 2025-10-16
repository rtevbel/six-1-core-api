import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  IStorageProvider,
  PutInput,
  PresignUploadInput,
  PresignGetInput,
  HeadOutput,
  MultipartCreateOutput,
  MultipartPartUrl,
} from "../interfaces/storage-provider.interface";

/**
 * R2Provider is a storage provider implementation for Cloudflare R2.
 * It provides methods for uploading, downloading, and managing files in R2 storage.
 */
export class R2Provider implements IStorageProvider {
  public readonly driver = "r2"; // Identifier for the storage driver
  private readonly s3: S3Client; // AWS S3 client instance
  private readonly bucket: string; // Default bucket name

  constructor(opts: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  }) {
    this.bucket = opts.bucket;
    this.s3 = new S3Client({
      region: "auto",
      endpoint: `https://${opts.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey,
      },
    });
  }

  /**
   * Uploads a file to R2 storage.
   * @param input - The input containing the file key, body, and metadata.
   * @returns The key of the uploaded file.
   */
  async put(input: PutInput) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: input.bucket ?? this.bucket,
        Key: input.key,
        Body: input.body as any,
        ContentType: input.contentType,
        CacheControl: input.cacheControl,
      })
    );
    return { key: input.key };
  }

  /**
   * Deletes a file from R2 storage.
   * @param bucket - The bucket name.
   * @param key - The key (path) of the file to delete.
   */
  async delete(bucket: string, key: string) {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: bucket ?? this.bucket, Key: key })
    );
  }

  /**
   * Retrieves metadata about a file.
   * @param bucket - The bucket name.
   * @param key - The key (path) of the file.
   * @returns Metadata about the file.
   */
  async head(bucket: string, key: string): Promise<HeadOutput> {
    try {
      const res = await this.s3.send(
        new HeadObjectCommand({ Bucket: bucket ?? this.bucket, Key: key })
      );
      return {
        contentLength: res.ContentLength ?? null,
        contentType: res.ContentType ?? null,
        etag: res.ETag ?? null,
        lastModified: res.LastModified ?? null,
        metadata: res.Metadata ?? {},
        exists: true,
      };
    } catch (e: any) {
      if (e?.$metadata?.httpStatusCode === 404) {
        return {
          contentLength: null,
          contentType: null,
          etag: null,
          lastModified: null,
          metadata: {},
          exists: false,
        };
      }
      throw e;
    }
  }

  /**
   * Generates a presigned URL for uploading a file.
   * @param input - The input containing the file key and metadata.
   * @returns A presigned URL for uploading the file.
   */
  async presignUpload(input: PresignUploadInput) {
    const Bucket = input.bucket ?? this.bucket;
    const cmd = new PutObjectCommand({
      Bucket,
      Key: input.key,
      ContentType: input.contentType,
      Metadata: input.metadata,
      ACL: input.acl === "public-read" ? "public-read" : undefined,
    });
    const url = await getSignedUrl(this.s3, cmd, {
      expiresIn: input.expiresIn ?? 900,
    });
    return { url, key: input.key };
  }

  /**
   * Generates a presigned URL for downloading a file.
   * @param input - The input containing the file key.
   * @returns A presigned URL for downloading the file.
   */
  async presignGet(input: PresignGetInput) {
    const Bucket = input.bucket ?? this.bucket;
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const getCmd = new GetObjectCommand({
      Bucket,
      Key: input.key,
      ResponseContentType: input.responseContentType,
      ResponseContentDisposition: input.responseContentDisposition,
    });
    const url = await getSignedUrl(this.s3, getCmd, {
      expiresIn: input.expiresIn ?? 900,
    });
    return { url };
  }

  /**
   * Lists all files under a given prefix.
   * @param bucket - The bucket name.
   * @param prefix - The prefix to list files under.
   * @param maxKeys - The maximum number of keys to return.
   * @returns A list of file keys.
   */
  async list(bucket: string, prefix: string, maxKeys = 1000) {
    const res = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: bucket ?? this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      })
    );
    return { keys: (res.Contents ?? []).map((o) => o.Key!).filter(Boolean) };
  }

  /**
   * Creates a multipart upload.
   * @param bucket - The bucket name.
   * @param key - The key (path) of the file.
   * @param contentType - The content type of the file.
   * @returns The upload ID.
   */
  async createMultipart(
    bucket: string,
    key: string,
    contentType?: string
  ): Promise<MultipartCreateOutput> {
    const res = await this.s3.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket ?? this.bucket,
        Key: key,
        ContentType: contentType,
      })
    );
    return { uploadId: res.UploadId! };
  }

  /**
   * Generates a presigned URL for uploading a part of a multipart upload.
   * @param bucket - The bucket name.
   * @param key - The key (path) of the file.
   * @param uploadId - The upload ID.
   * @param partNumber - The part number.
   * @returns A presigned URL for uploading the part.
   */
  async presignUploadPart(
    bucket: string,
    key: string,
    uploadId: string,
    partNumber: number
  ): Promise<MultipartPartUrl> {
    const { UploadPartCommand } = await import("@aws-sdk/client-s3");
    const cmd = new UploadPartCommand({
      Bucket: bucket ?? this.bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    const url = await getSignedUrl(this.s3, cmd, { expiresIn: 900 });
    return { url, partNumber };
  }

  /**
   * Completes a multipart upload.
   * @param bucket - The bucket name.
   * @param key - The key (path) of the file.
   * @param uploadId - The upload ID.
   * @param parts - The list of uploaded parts.
   */
  async completeMultipart(
    bucket: string,
    key: string,
    uploadId: string,
    parts: Array<{ ETag: string; PartNumber: number }>
  ): Promise<void> {
    await this.s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket ?? this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      })
    );
  }

  /**
   * Aborts a multipart upload.
   * @param bucket - The bucket name.
   * @param key - The key (path) of the file.
   * @param uploadId - The upload ID.
   */
  async abortMultipart(
    bucket: string,
    key: string,
    uploadId: string
  ): Promise<void> {
    await this.s3.send(
      new AbortMultipartUploadCommand({
        Bucket: bucket ?? this.bucket,
        Key: key,
        UploadId: uploadId,
      })
    );
  }
}