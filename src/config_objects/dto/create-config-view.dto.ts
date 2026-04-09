import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

type ViewType = 'list' | 'board' | 'detail';

/**
 * Create DTO for configuration views.
 *
 * Used by admin APIs to define a new view (list/board/detail) for a
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

  @IsEnum(['list', 'board', 'detail'])
  viewType!: ViewType;

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

