import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

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
}
