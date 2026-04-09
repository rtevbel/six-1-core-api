import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Delete DTO for lifecycle transitions.
 *
 * Used by admin APIs to remove a lifecycle transition definition. For
 * tenant-level configuration `tenantId` should be provided; for system-level
 * configuration it may be omitted and derived from context.
 */
export class DeleteLifecycleTransitionDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  deletedBy!: number;

  @IsInt()
  @Min(1)
  configObjectLifecycleTransitionId!: number;
}

