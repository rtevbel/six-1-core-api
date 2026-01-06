import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * DTO used to create a resource availability window.
 */
export class CreateResourceAvailabilityDto {
  @IsNumber()
  @IsNotEmpty()
  resourceId!: number;

  @IsDateString()
  @IsNotEmpty()
  startTime!: string;

  @IsDateString()
  @IsNotEmpty()
  endTime!: string;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  recurrenceRule?: string;
}
