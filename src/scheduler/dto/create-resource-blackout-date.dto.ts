import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * DTO used to create blackout windows for resources.
 */
export class CreateResourceBlackoutDateDto {
  @IsNumber()
  @IsNotEmpty()
  resourceId!: number;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;
}
