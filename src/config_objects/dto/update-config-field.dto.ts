import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateConfigFieldDto } from './create-config-field.dto';

/**
 * Update DTO for configuration fields.
 *
 * Extends the create DTO as a partial and adds identifiers used to update
 * an existing `config_object_fields` row. For tenant-level configuration
 * `tenantId` should be provided; for system-level configuration it may be
 * omitted and derived from context.
 */
export class UpdateConfigFieldDto extends PartialType(CreateConfigFieldDto) {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  updatedBy!: number;

  @IsInt()
  @Min(1)
  configObjectFieldId!: number;
}

