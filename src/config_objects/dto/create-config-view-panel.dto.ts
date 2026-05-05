import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PANEL_LAYOUT_DISPLAY_MODES } from '../panel-layout/panel-layout.constants';
import type { PanelLayoutDisplayMode } from '../panel-layout/panel-layout.types';

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
  @IsIn([...PANEL_LAYOUT_DISPLAY_MODES])
  panelType!: PanelLayoutDisplayMode;

  @IsObject()
  @IsOptional()
  layoutConfig?: Record<string, unknown> | null;

  @IsInt()
  @IsOptional()
  orderIndex?: number;
}

