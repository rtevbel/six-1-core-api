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
}
