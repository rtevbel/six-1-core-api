import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * Create DTO for lifecycle states.
 *
 * Used by admin APIs to define a new lifecycle state for an object type.
 * For tenant-level configuration `tenantId` should be provided; for
 * system-level configuration it may be omitted and derived from context.
 */
export class CreateLifecycleDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  configTemplateSetId!: number;

  @IsInt()
  @Min(1)
  createdBy!: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @IsString()
  @IsNotEmpty()
  stateKey!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsInt()
  @IsOptional()
  orderIndex?: number;
}

