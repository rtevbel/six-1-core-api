import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  SharingStatus,
  TaskPermissionLevel,
} from '../../entities/shared_task.entity';

export class FiltersSharedTaskDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taskId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sharedByTenantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sharedWithTenantId?: number;

  @IsOptional()
  @IsEnum(['view', 'edit', 'assign'])
  permissionLevel?: TaskPermissionLevel;

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
