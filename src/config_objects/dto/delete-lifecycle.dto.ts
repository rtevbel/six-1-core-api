import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Delete DTO for lifecycle states.
 *
 * Used by admin APIs to remove a lifecycle state definition. For tenant-level
 * configuration `tenantId` should be provided; for system-level configuration
 * it may be omitted and derived from context.
 */
export class DeleteLifecycleDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  deletedBy!: number;

  @IsInt()
  @Min(1)
  configObjectLifecycleId!: number;
}

