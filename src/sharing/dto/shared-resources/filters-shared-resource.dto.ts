import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  ResourcePermissionLevel,
  SharingStatus,
} from '../../entities/shared_resource.entity';

export class FiltersSharedResourceDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  resourceId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sharedByTenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sharedWithTenantId?: number;

  @IsOptional()
  @IsEnum(['view', 'use', 'manage'])
  permissionLevel?: ResourcePermissionLevel;

  @IsOptional()
  @IsEnum(['pending', 'active', 'revoked'])
  sharingStatus?: SharingStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsIn(['sharingId', 'validFrom', 'validUntil', 'createdAt'])
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
