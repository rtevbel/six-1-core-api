import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Confirm a completed direct upload by path.
 */
export class ConfirmMediaUploadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  path!: string;

  @IsOptional()
  @IsString()
  bucket?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantId?: string;

  @IsOptional()
  @IsBoolean()
  isPlatformAdmin?: boolean;
}

/**
 * Presign a short-lived download URL for a media path.
 */
export class PresignMediaDownloadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  path!: string;

  @IsOptional()
  @IsString()
  bucket?: string;

  @IsOptional()
  @IsNumber()
  expiresIn?: number;

  @IsOptional()
  @IsIn(['inline', 'attachment'])
  disposition?: 'inline' | 'attachment';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  downloadName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantId?: string;

  @IsOptional()
  @IsBoolean()
  isPlatformAdmin?: boolean;
}

/**
 * Delete one or more media objects by path.
 */
export class DeleteMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  path?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paths?: string[];

  @IsOptional()
  @IsString()
  bucket?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantId?: string;

  @IsOptional()
  @IsBoolean()
  isPlatformAdmin?: boolean;
}
