import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Public email verification RPC for any sor_bound config object (Phase 4).
 */
export class VerifyConfigObjectEmailDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @IsString()
  @IsNotEmpty()
  token!: string;

  /** Optional client identifier from gateway (e.g. normalized IP) for rate limiting. */
  @IsOptional()
  @IsString()
  clientKey?: string;
}
