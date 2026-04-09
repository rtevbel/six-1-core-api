import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Delete DTO for configuration relationships.
 *
 * Used by admin APIs to remove a relationship definition. For tenant-level
 * configuration `tenantId` should be provided; for system-level configuration
 * it may be omitted and derived from context.
 */
export class DeleteConfigRelationshipDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  deletedBy!: number;

  @IsInt()
  @Min(1)
  configObjectRelationshipId!: number;
}

