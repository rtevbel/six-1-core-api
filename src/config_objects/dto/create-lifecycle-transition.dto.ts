import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * Create DTO for lifecycle transitions.
 *
 * Used by admin APIs to define an allowed transition between two lifecycle
 * states for an object type. For tenant-level configuration `tenantId`
 * should be provided; for system-level configuration it may be omitted and
 * derived from context.
 */
export class CreateLifecycleTransitionDto {
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
  fromStateKey!: string;

  @IsString()
  @IsNotEmpty()
  toStateKey!: string;

  @IsString()
  @IsOptional()
  rulesJson?: string | null;
}

