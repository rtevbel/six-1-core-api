import { IsInt, IsOptional, Min } from 'class-validator';
export { CreateConfigViewPanelDto } from './create-config-view-panel.dto';
export { UpdateConfigViewPanelDto } from './update-config-view-panel.dto';
export { DeleteConfigViewPanelDto } from './delete-config-view-panel.dto';

/**
 * List DTO for configuration view panels.
 *
 * Used to fetch all `config_object_view_panels` for a config view and tenant.
 */
export class ListConfigViewPanelsDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  configObjectViewId!: number;
}

