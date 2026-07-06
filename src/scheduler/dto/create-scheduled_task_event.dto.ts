import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

const SCHEDULED_TASK_EVENT_KINDS = [
  'enqueued_start',
  'enqueued_end',
  'run_start',
  'run_end',
  'deferred',
  'failed',
  'cancelled',
  'paused',
  'resumed',
] as const;

export class CreateScheduledTaskEventDto {
  @IsNumber()
  @IsNotEmpty()
  scheduledTaskId!: number;

  @IsEnum(SCHEDULED_TASK_EVENT_KINDS)
  kind!: (typeof SCHEDULED_TASK_EVENT_KINDS)[number];

  @IsString()
  @IsOptional()
  jobId?: string;

  @IsObject()
  @IsOptional()
  details?: object;
}
