import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateActionBindingDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  onEventName!: string;

  @IsNumber()
  @IsNotEmpty()
  actionId!: number;

  @IsObject()
  @IsOptional()
  filterJson?: Record<string, unknown> | null;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsNotEmpty()
  createdBy!: number;

  @IsNumber()
  @IsOptional()
  updatedBy?: number;
}
