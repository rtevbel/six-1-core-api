import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Delete DTO for configuration fields.
 *
 * Used by admin APIs to remove a `config_object_fields` row. For tenant-level
 * configuration `tenantId` should be provided; for system-level configuration
 * it may be omitted and derived from context.
 */
export class DeleteConfigFieldDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  deletedBy!: number;

  @IsInt()
  @Min(1)
  configObjectFieldId!: number;
}

