import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ConfigTemplateSetStatus } from '../entities/config_template_set.entity';

/**
 * DTO for listing template sets. For tenant-level configuration `tenantId`
 * should be provided; for system-level configuration it may be omitted and
 * derived from context.
 */
export class ListTemplateSetsDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;
}

/**
 * DTO for creating a new configuration template set. For tenant-level
 * configuration `tenantId` should be provided; for system-level configuration
 * it may be omitted and derived from context.
 */
export class CreateTemplateSetDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  createdBy!: number;

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'CONFLICT'])
  @IsOptional()
  status?: ConfigTemplateSetStatus;
}

/**
 * DTO for updating an existing configuration template set. For tenant-level
 * configuration `tenantId` should be provided; for system-level configuration
 * it may be omitted and derived from context.
 */
export class UpdateTemplateSetDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  updatedBy!: number;

  @IsInt()
  @Min(1)
  configTemplateSetId!: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'CONFLICT'])
  @IsOptional()
  status?: ConfigTemplateSetStatus;
}

/**
 * DTO for deactivating (soft-disabling) a configuration template set. For
 * tenant-level configuration `tenantId` should be provided; for system-level
 * configuration it may be omitted and derived from context.
 */
export class DeactivateTemplateSetDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  updatedBy!: number;

  @IsInt()
  @Min(1)
  configTemplateSetId!: number;
}

