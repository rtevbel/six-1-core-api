import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Input for `v0.1_get_process_instance_step_execution_log`.
 */
export class GetProcessInstanceStepExecutionLogDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  processInstanceId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  tenantId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  stepInstanceId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
