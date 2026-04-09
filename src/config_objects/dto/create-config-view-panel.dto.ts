import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

type PanelType = 'summary' | 'section' | 'related' | 'custom';

/**
 * Create DTO for configuration view panels.
 *
 * Used by admin APIs to define a new panel on a config view. For tenant-level
 * configuration `tenantId` should be provided; for system-level configuration
 * it may be omitted and derived from context.
 */
export class CreateConfigViewPanelDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  createdBy!: number;

  @IsInt()
  @Min(1)
  configObjectViewId!: number;

  @IsString()
  @IsNotEmpty()
  panelKey!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  panelType!: PanelType;

  @IsObject()
  @IsOptional()
  layoutConfig?: Record<string, unknown> | null;

  @IsInt()
  @IsOptional()
  orderIndex?: number;
}

