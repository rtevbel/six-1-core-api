import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO used to request lifecycle configuration for a given object type.
 *
 * For tenant-scoped configuration `tenantId` should be provided; for
 * system-level (superadmin / global template-set management) it may be
 * omitted and derived from auth context.
 */
export class GetConfigLifecyclesDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;
}

