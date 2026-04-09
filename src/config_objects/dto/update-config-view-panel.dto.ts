import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateConfigViewPanelDto } from './create-config-view-panel.dto';

/**
 * Update DTO for configuration view panels.
 *
 * Extends the create DTO as a partial and adds identifiers used to update
 * an existing `config_object_view_panels` row. For tenant-level configuration
 * `tenantId` should be provided; for system-level configuration it may be
 * omitted and derived from context.
 */
export class UpdateConfigViewPanelDto extends PartialType(CreateConfigViewPanelDto) {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  updatedBy!: number;

  @IsInt()
  @Min(1)
  configObjectViewPanelId!: number;
}

