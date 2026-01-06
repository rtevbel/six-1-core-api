import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  ProjectPermissionLevel,
  SharingStatus,
} from '../../entities/shared_project.entity';

export class FiltersSharedProjectDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  projectId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sharedByTenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sharedWithTenantId?: number;

  @IsOptional()
  @IsEnum(['view', 'edit', 'manage'])
  permissionLevel?: ProjectPermissionLevel;

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
