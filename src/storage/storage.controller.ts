// src/storage/storage.controller.ts
import { Controller, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { StorageService } from './storage.service';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';
import { StartDirectUploadDto } from './dto/start-direct-upload.dto';
import { ConfirmDirectUploadDto } from './dto/confirm-direct-upload.dto';
import { PresignDownloadDto } from './dto/presign-download.dto';
import {
  MICROSERVICE_PRESIGN_UPLOAD_PATTERN,
  MICROSERVICE_PRESIGN_GET_PATTERN,
  MICROSERVICE_START_DIRECT_UPLOAD_PATTERN,
  MICROSERVICE_CONFIRM_DIRECT_UPLOAD_PATTERN,
  MICROSERVICE_PRESIGN_DOWNLOAD_PATTERN,
} from './constants';

/**
 * Controller for handling storage-related operations in a microservice style.
 */
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Step 1: Generate a canonical key and a presigned PUT URL.
   * The client will use this URL to upload directly to cloud storage.
   * @param userId - The ID of the user making the request.
   * @param dto - Data Transfer Object containing upload details.
   * @returns Presigned URL and metadata for the upload.
   */
  @MessagePattern(MICROSERVICE_START_DIRECT_UPLOAD_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async startDirectUpload(
    @Payload('userId') userId: number,
    @Payload('data') dto: StartDirectUploadDto,
  ) {
    // Prefer userId from auth, but allow override if provided in dto.userId
    const effectiveUserId = dto.userId ?? String(userId);
    return this.storageService.startDirectUpload({
      filename: dto.filename,
      contentType: dto.contentType,
      tenantId: dto.tenantId,
      userId: effectiveUserId,
      prefix: dto.prefix ?? 'attachments',
      bucket: dto.bucket,
      expiresIn: dto.expiresIn,
    });
  }

  /**
   * Step 2: Confirm the upload (via HEAD request) and persist the DB record.
   * Returns metadata that can be stored or used immediately.
   * @param userId - The ID of the user making the request.
   * @param dto - Data Transfer Object containing confirmation details.
   * @returns Metadata about the uploaded file.
   */
  @MessagePattern(MICROSERVICE_CONFIRM_DIRECT_UPLOAD_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async confirmDirectUpload(
    @Payload('userId') userId: number,
    @Payload('data') dto: ConfirmDirectUploadDto,
  ) {
    // Perform a HEAD request to confirm the upload
    const info = await this.storageService.confirmDirectUpload({
      key: dto.key,
      bucket: dto.bucket,
    });

    // OPTIONAL: Persist the file metadata in the database
    // Example: await this.filesRepo.create(...) or prisma.fileObject.create(...)

    return info; // { key, bucket, size, contentType, etag, lastModified, driver }
  }

  /**
   * Generate a presigned GET URL for downloading a file.
   * The URL can be used for inline display or as an attachment.
   * @param userId - The ID of the user making the request.
   * @param dto - Data Transfer Object containing download details.
   * @returns Presigned URL for the file download.
   */
  @MessagePattern(MICROSERVICE_PRESIGN_DOWNLOAD_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async presignDownload(
    @Payload('userId') userId: number,
    @Payload('data') dto: PresignDownloadDto,
  ) {
    return this.storageService.getPresignedDownloadUrl({
      key: dto.key,
      bucket: dto.bucket,
      expiresIn: dto.expiresIn ?? 300,
      inline: !!dto.inline,
      downloadName: dto.name,
    });
  }

  /**
   * Backward-compatible handler for generating a presigned PUT URL for uploads.
   * @param _userId - The ID of the user making the request (not used).
   * @param body - Request body containing upload details.
   * @returns Presigned URL for the upload.
   */
  @MessagePattern(MICROSERVICE_PRESIGN_UPLOAD_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async presignUploadCompat(
    @Payload('userId') _userId: number,
    @Payload('data')
    body: {
      key: string;
      contentType?: string;
      expiresIn?: number;
      bucket?: string;
    },
  ) {
    return this.storageService.presignUpload({
      key: body.key,
      contentType: body.contentType,
      expiresIn: body.expiresIn ?? 900,
      bucket: body.bucket,
    });
  }

  /**
   * Backward-compatible handler for generating a presigned GET URL for downloads.
   * @param _userId - The ID of the user making the request (not used).
   * @param body - Request body containing download details.
   * @returns Presigned URL for the file download.
   */
  @MessagePattern(MICROSERVICE_PRESIGN_GET_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async presignGetCompat(
    @Payload('userId') _userId: number,
    @Payload('data') body: { key: string; expiresIn?: number; bucket?: string },
  ) {
    return this.storageService.presignGet({
      key: body.key,
      expiresIn: body.expiresIn ?? 900,
      bucket: body.bucket,
    });
  }
}
