import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';
import {
  ResourcePermissionLevel,
  SharingStatus,
} from '../../entities/shared_resource.entity';

export class CreateSharedResourceDto {
  @IsNumber()
  @IsNotEmpty()
  resourceId!: number;

  @IsNumber()
  @IsNotEmpty()
  sharedByTenantId!: number;

  @IsNumber()
  @IsNotEmpty()
  sharedWithTenantId!: number;

  @IsEnum(['view', 'use', 'manage'])
  permissionLevel!: ResourcePermissionLevel;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsEnum(['pending', 'active', 'revoked'])
  @IsOptional()
  sharingStatus?: SharingStatus;
}
