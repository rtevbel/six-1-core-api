import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Input for `v0.1_get_process_instance_timeline`.
 */
export class GetProcessInstanceTimelineDto {
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
  @Max(500)
  @Type(() => Number)
  limit?: number;
}
