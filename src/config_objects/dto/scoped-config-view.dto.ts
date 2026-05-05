import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  CONFIG_OBJECT_VIEW_TYPES,
  type ConfigObjectViewType,
} from '../constants/config-object-view-type';

/**
 * Base DTO for scoped view-config contracts keyed by runtime `entityKey`.
 */
class ScopedConfigViewBaseDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  entityKey!: string;
}

export class GetActiveScopedConfigViewDto extends ScopedConfigViewBaseDto {
  @IsIn([...CONFIG_OBJECT_VIEW_TYPES])
  viewType!: ConfigObjectViewType;
}

export class ListActiveScopedConfigViewsDto extends ScopedConfigViewBaseDto {}

export class UpsertScopedConfigViewDto extends ScopedConfigViewBaseDto {
  @IsIn([...CONFIG_OBJECT_VIEW_TYPES])
  viewType!: ConfigObjectViewType;

  @IsInt()
  @Min(1)
  @IsOptional()
  configObjectViewId?: number;

  @IsInt()
  @Min(1)
  updatedBy!: number;

  @IsString()
  @IsOptional()
  viewKey?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsOptional()
  roleKey?: string | null;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  configJson?: Record<string, unknown> | null;
}

export class ActivateScopedConfigViewDto extends ScopedConfigViewBaseDto {
  @IsIn([...CONFIG_OBJECT_VIEW_TYPES])
  viewType!: ConfigObjectViewType;

  @IsInt()
  @Min(1)
  configObjectViewId!: number;

  @IsInt()
  @Min(1)
  updatedBy!: number;
}

export class DeactivateScopedConfigViewDto extends ScopedConfigViewBaseDto {
  @IsIn([...CONFIG_OBJECT_VIEW_TYPES])
  viewType!: ConfigObjectViewType;

  @IsInt()
  @Min(1)
  @IsOptional()
  configObjectViewId?: number;

  /** When omitted, the handler uses the message `userId` (tenant user performing the action). */
  @IsInt()
  @Min(1)
  @IsOptional()
  updatedBy?: number;
}
