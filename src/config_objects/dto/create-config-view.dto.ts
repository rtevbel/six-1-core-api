import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  CONFIG_OBJECT_VIEW_TYPES,
  type ConfigObjectViewType,
} from '../constants/config-object-view-type';

/**
 * Create DTO for configuration views.
 *
 * Used by admin APIs to define a new view (list, detail, or form) for a
 * given object type. For tenant-level configuration `tenantId` should be
 * provided; for system-level configuration it may be omitted and derived
 * from context.
 */
export class CreateConfigViewDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  createdBy!: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @IsString()
  @IsNotEmpty()
  viewKey!: string;

  @IsIn([...CONFIG_OBJECT_VIEW_TYPES])
  viewType!: ConfigObjectViewType;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsOptional()
  roleKey?: string | null;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

