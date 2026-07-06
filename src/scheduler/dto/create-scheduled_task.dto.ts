import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { BlockReason, ScheduledTaskStatus } from '../constants';

export class CreateScheduledTaskDto {
  @IsNumber()
  @IsNotEmpty()
  tenantId!: number;

  @IsNumber()
  @IsNotEmpty()
  taskId!: number;

  @IsNumber()
  @IsNotEmpty()
  taskStatusId!: number;

  @IsDateString()
  @IsNotEmpty()
  requestedStartUtc!: string;

  @IsDateString()
  @IsNotEmpty()
  requestedEndUtc!: string;

  @IsDateString()
  @IsNotEmpty()
  effectiveStartUtc!: string;

  @IsDateString()
  @IsNotEmpty()
  effectiveEndUtc!: string;

  @IsString()
  @IsOptional()
  tzUsed?: string;

  @IsNumber()
  @IsOptional()
  tenantUserId?: number;

  @IsNumber()
  @IsOptional()
  parentScheduledTaskId?: number;

  @IsNumber()
  @IsOptional()
  processInstanceId?: number;

  @IsEnum(['none', 'calendar', 'dependency'])
  @IsOptional()
  blockReason?: BlockReason;

  @IsEnum([
    'scheduled',
    'queued',
    'running',
    'completed',
    'failed',
    'cancelled',
    'paused',
    'expired',
  ])
  @IsOptional()
  status?: ScheduledTaskStatus;
}
