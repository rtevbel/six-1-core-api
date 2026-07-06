import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * Resolves a composite admin record (primary + related FK snapshots).
 */
export class ResolveCompositeSnapshotDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  tenantId?: number | null;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @IsInt()
  @Min(1)
  id!: number;
}
