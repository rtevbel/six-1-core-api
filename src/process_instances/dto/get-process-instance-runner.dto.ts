import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PROCESS_RUNNER_MAX_CHILD_DEPTH } from '../process-runner.constants';

/**
 * Input for `v0.1_get_process_instance_runner`.
 */
export class GetProcessInstanceRunnerDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  processInstanceId!: number;

  /**
   * When provided, core-api rejects cross-tenant reads (gateway should always send this).
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  tenantId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  tenantUserId?: number;

  /**
   * How many child levels to embed as full `runner` payloads on `children[]`.
   * `0` (default) = summaries only; `1` = direct children; max {@link PROCESS_RUNNER_MAX_CHILD_DEPTH}.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PROCESS_RUNNER_MAX_CHILD_DEPTH)
  @Type(() => Number)
  childDepth?: number;
}
