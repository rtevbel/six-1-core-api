import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO for runtime manifest resolution by entity + tenant scope.
 */
export class GetRuntimeManifestDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  entityKey!: string;

  @IsBoolean()
  @IsOptional()
  includeDiagnostics?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  configObjectId?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  configTemplateSetId?: number;

  @IsString()
  @IsOptional()
  templateSetKey?: string;
}
