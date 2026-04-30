import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class ValidateRuntimeRelationActionDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  entityKey!: string;

  @IsString()
  @IsNotEmpty()
  relationKey!: string;

  @IsString()
  @IsNotEmpty()
  actionRef!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  grantedPermissions?: string[];
}
