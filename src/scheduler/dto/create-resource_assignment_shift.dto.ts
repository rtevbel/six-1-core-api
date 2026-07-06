import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';

const SHIFT_STATUSES = [
  'planned',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export class CreateResourceAssignmentShiftDto {
  @IsNumber()
  @IsNotEmpty()
  resourceAssignmentId!: number;

  @IsNumber()
  @IsNotEmpty()
  tenantUserId!: number;

  @IsDateString()
  @IsNotEmpty()
  plannedStartUtc!: string;

  @IsDateString()
  @IsNotEmpty()
  plannedEndUtc!: string;

  @IsNumber()
  @IsOptional()
  sequenceNo?: number;

  @IsNumber()
  @IsOptional()
  scheduledTaskId?: number;

  @IsEnum(SHIFT_STATUSES)
  @IsOptional()
  status?: (typeof SHIFT_STATUSES)[number];
}
