import { Controller, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { StorageService } from './storage.service';
import { MediaService } from './media.service';
import { AppRpcValidationPipe } from '../common/pipes/app-rpc-validation.pipe';
import { RequirePermissions } from '../authorization/authorization.decorator';
import { StartDirectUploadDto } from './dto/start-direct-upload.dto';
import { ConfirmDirectUploadDto } from './dto/confirm-direct-upload.dto';
import { PresignDownloadDto } from './dto/presign-download.dto';
import { StartMediaUploadDto } from './dto/start-media-upload.dto';
import {
  ConfirmMediaUploadDto,
  DeleteMediaDto,
  PresignMediaDownloadDto,
} from './dto/confirm-media-upload.dto';
import {
  MICROSERVICE_PRESIGN_UPLOAD_PATTERN,
  MICROSERVICE_PRESIGN_GET_PATTERN,
  MICROSERVICE_START_DIRECT_UPLOAD_PATTERN,
  MICROSERVICE_CONFIRM_DIRECT_UPLOAD_PATTERN,
  MICROSERVICE_PRESIGN_DOWNLOAD_PATTERN,
  MICROSERVICE_MEDIA_START_UPLOAD_PATTERN,
  MICROSERVICE_MEDIA_CONFIRM_UPLOAD_PATTERN,
  MICROSERVICE_MEDIA_PRESIGN_DOWNLOAD_PATTERN,
  MICROSERVICE_MEDIA_DELETE_PATTERN,
} from './constants';
import type { MediaCallerContext } from './media-acl';

/**
 * Storage / media RPC handlers.
 * Gateway authenticates and forwards; Core owns provider I/O, ACL, and path allocation.
 */
@Controller('storage')
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly mediaService: MediaService,
  ) {}

  private buildCaller(
    userId: number,
    dto: { tenantId?: string; isPlatformAdmin?: boolean },
  ): MediaCallerContext {
    return {
      userId,
      tenantId: dto.tenantId,
      isPlatformAdmin: dto.isPlatformAdmin === true,
    };
  }

  // --- Canonical media RPCs ---

  @MessagePattern(MICROSERVICE_MEDIA_START_UPLOAD_PATTERN)
  @RequirePermissions('storage.create')
  @UsePipes(AppRpcValidationPipe)
  async mediaStartUpload(
    @Payload('userId') userId: number,
    @Payload('data') dto: StartMediaUploadDto,
  ) {
    return this.mediaService.startUpload({
      filename: dto.filename,
      contentType: dto.contentType,
      ownership: dto.ownership,
      accept: dto.accept,
      maxSizeBytes: dto.maxSizeBytes,
      expiresIn: dto.expiresIn,
      bucket: dto.bucket,
      caller: this.buildCaller(userId, dto),
    });
  }

  @MessagePattern(MICROSERVICE_MEDIA_CONFIRM_UPLOAD_PATTERN)
  @RequirePermissions('storage.create')
  @UsePipes(AppRpcValidationPipe)
  async mediaConfirmUpload(
    @Payload('userId') userId: number,
    @Payload('data') dto: ConfirmMediaUploadDto,
  ) {
    return this.mediaService.confirmUpload({
      path: dto.path,
      bucket: dto.bucket,
      caller: this.buildCaller(userId, dto),
    });
  }

  @MessagePattern(MICROSERVICE_MEDIA_PRESIGN_DOWNLOAD_PATTERN)
  @RequirePermissions('storage.read')
  @UsePipes(AppRpcValidationPipe)
  async mediaPresignDownload(
    @Payload('userId') userId: number,
    @Payload('data') dto: PresignMediaDownloadDto,
  ) {
    return this.mediaService.presignDownload({
      path: dto.path,
      bucket: dto.bucket,
      expiresIn: dto.expiresIn,
      disposition: dto.disposition,
      downloadName: dto.downloadName,
      caller: this.buildCaller(userId, dto),
    });
  }

  @MessagePattern(MICROSERVICE_MEDIA_DELETE_PATTERN)
  @RequirePermissions('storage.delete')
  @UsePipes(AppRpcValidationPipe)
  async mediaDelete(
    @Payload('userId') userId: number,
    @Payload('data') dto: DeleteMediaDto,
  ) {
    return this.mediaService.deletePaths({
      path: dto.path,
      paths: dto.paths,
      bucket: dto.bucket,
      caller: this.buildCaller(userId, dto),
    });
  }

  // --- Legacy direct-upload patterns ---

  @MessagePattern(MICROSERVICE_START_DIRECT_UPLOAD_PATTERN)
  @RequirePermissions('storage.create')
  @UsePipes(AppRpcValidationPipe)
  async startDirectUpload(
    @Payload('userId') userId: number,
    @Payload('data') dto: StartDirectUploadDto,
  ) {
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

  @MessagePattern(MICROSERVICE_CONFIRM_DIRECT_UPLOAD_PATTERN)
  @RequirePermissions('storage.create')
  @UsePipes(AppRpcValidationPipe)
  async confirmDirectUpload(
    @Payload('userId') _userId: number,
    @Payload('data') dto: ConfirmDirectUploadDto,
  ) {
    return this.storageService.confirmDirectUpload({
      key: dto.key,
      bucket: dto.bucket,
    });
  }

  @MessagePattern(MICROSERVICE_PRESIGN_DOWNLOAD_PATTERN)
  @RequirePermissions('storage.read')
  @UsePipes(AppRpcValidationPipe)
  async presignDownload(
    @Payload('userId') _userId: number,
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

  @MessagePattern(MICROSERVICE_PRESIGN_UPLOAD_PATTERN)
  @RequirePermissions('storage.create')
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

  @MessagePattern(MICROSERVICE_PRESIGN_GET_PATTERN)
  @RequirePermissions('storage.read')
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
