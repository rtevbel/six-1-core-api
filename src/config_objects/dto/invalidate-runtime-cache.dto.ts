import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * Manual runtime cache invalidation request.
 * Optional filters allow targeted clears by tenant and/or entity.
 */
export class InvalidateRuntimeCacheDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  entityKey?: string;

  @IsBoolean()
  @IsOptional()
  includeSchemaCache?: boolean;

  @IsBoolean()
  @IsOptional()
  includeViewCache?: boolean;

  @IsBoolean()
  @IsOptional()
  includeManifestCache?: boolean;
}
