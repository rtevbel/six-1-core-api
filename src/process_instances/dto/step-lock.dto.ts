import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class AcquireProcessStepLockDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  stepInstanceId!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  tenantUserId!: number;

  @IsOptional()
  @IsInt()
  @Min(5_000)
  @Max(10 * 60_000)
  @Type(() => Number)
  ttlMs?: number;
}

export class ReleaseProcessStepLockDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  stepInstanceId!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  tenantUserId!: number;
}

export class HeartbeatProcessStepLockDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  stepInstanceId!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  tenantUserId!: number;

  @IsOptional()
  @IsInt()
  @Min(5_000)
  @Max(10 * 60_000)
  @Type(() => Number)
  ttlMs?: number;
}

