import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateConfigObjectDto } from './create-config-object.dto';

/**
 * Update DTO for configuration objects.
 *
 * Extends the create DTO as a partial and adds identifiers used to update
 * an existing `config_objects` row. For tenant-level configuration `tenantId`
 * should be provided; for system-level configuration it may be omitted and
 * derived from context.
 */
export class UpdateConfigObjectDto extends PartialType(
  OmitType(CreateConfigObjectDto, ['tenantId', 'configTemplateSetId', 'createdBy'] as const),
) {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  updatedBy?: number;

  
  @IsInt()
  @Min(1)
  @IsOptional()
  configObjectId!: number;
}

