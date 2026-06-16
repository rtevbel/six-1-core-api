import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Completes a process instance step via the orchestrator (manual / Runner).
 */
export class CompleteProcessInstanceStepDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  processInstanceId!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  stepInstanceId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  tenantId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  correlationId?: string;

  /** Tenant-scoped user id for step-level permission checks (optional). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  tenantUserId?: number;
}
