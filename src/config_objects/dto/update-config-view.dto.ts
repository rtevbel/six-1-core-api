import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateConfigViewDto } from './create-config-view.dto';

/**
 * Update DTO for configuration views.
 *
 * Extends the create DTO as a partial and adds identifiers used to update
 * an existing `config_object_views` row. For tenant-level configuration
 * `tenantId` should be provided; for system-level configuration it may be
 * omitted and derived from context.
 */
export class UpdateConfigViewDto extends PartialType(CreateConfigViewDto) {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  updatedBy!: number;

  @IsInt()
  @Min(1)
  configObjectViewId!: number;
}

