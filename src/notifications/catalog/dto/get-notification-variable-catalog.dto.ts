import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class GetNotificationVariableCatalogDto {
  @IsInt()
  @Min(1)
  tenantId!: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  eventName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  objectType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  processTemplateId?: number;
}
