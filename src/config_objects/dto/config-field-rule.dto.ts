import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ListConfigFieldRulesDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  configObjectFieldId!: number;
}

export class CreateConfigFieldRuleDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  configObjectFieldId!: number;

  @IsInt()
  @Min(1)
  createdBy!: number;

  @IsString()
  @IsOptional()
  lifecycleStateKey?: string | null;

  @IsString()
  @IsOptional()
  roleKey?: string | null;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsBoolean()
  @IsOptional()
  isReadonly?: boolean;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsObject()
  @IsOptional()
  rulesJson?: Record<string, unknown> | null;
}

export class UpdateConfigFieldRuleDto extends PartialType(CreateConfigFieldRuleDto) {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  updatedBy!: number;

  @IsInt()
  @Min(1)
  configObjectFieldRuleId!: number;
}

export class DeleteConfigFieldRuleDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  deletedBy!: number;

  @IsInt()
  @Min(1)
  configObjectFieldRuleId!: number;
}
