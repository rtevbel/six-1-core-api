import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MEDIA_OWNER_SCOPES } from '../media-ownership';

export class MediaOwnershipDto {
  @IsString()
  @IsIn([...MEDIA_OWNER_SCOPES])
  scope!: (typeof MEDIA_OWNER_SCOPES)[number];

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  ownerId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  objectType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  fieldKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  recordId?: string | null;
}

/**
 * Start a direct (presigned) upload and allocate a canonical media path.
 */
export class StartMediaUploadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contentType?: string;

  @ValidateNested()
  @Type(() => MediaOwnershipDto)
  ownership!: MediaOwnershipDto;

  /** Optional HTML accept hint from field registry. */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  accept?: string;

  /** Optional max size hint from field registry (bytes). */
  @IsOptional()
  @IsNumber()
  maxSizeBytes?: number;

  @IsOptional()
  @IsNumber()
  expiresIn?: number;

  @IsOptional()
  @IsString()
  bucket?: string;

  /** Caller tenant for ACL (Gateway should pass authenticated tenant). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantId?: string;

  /** Platform admin flag from Gateway auth context. */
  @IsOptional()
  @IsBoolean()
  isPlatformAdmin?: boolean;
}
