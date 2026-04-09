import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Delete DTO for configuration view panels.
 *
 * Used by admin APIs to remove a `config_object_view_panels` row. For
 * tenant-level configuration `tenantId` should be provided; for system-level
 * configuration it may be omitted and derived from context.
 */
export class DeleteConfigViewPanelDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  deletedBy!: number;

  @IsInt()
  @Min(1)
  configObjectViewPanelId!: number;
}

