import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsObject, IsOptional, Min } from 'class-validator';

export class GetProcessTemplateStepExtensionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  processTemplateStepId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tenantId?: number;
}

export class UpsertProcessTemplateStepExtensionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  processTemplateStepId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tenantId?: number;

  @IsObject()
  extensions!: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  updatedBy?: number;
}

export class DeleteProcessTemplateStepExtensionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  processTemplateStepId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tenantId?: number;
}
