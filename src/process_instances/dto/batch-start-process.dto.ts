import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  Min,
  Validate,
  ValidateNested,
} from 'class-validator';
import { IsProcessSubjectTypeConstraint } from '../validators/is-process-subject-type.validator';

export class BatchStartProcessItemDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9_]*$/)
  @Validate(IsProcessSubjectTypeConstraint)
  subjectType!: string;

  /**
   * Subject entity id. Use `0` or omit for `workflow` (self-subject applied during instantiation).
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  subjectId?: number;

  @IsOptional()
  @IsObject()
  subjectMetadata?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  correlationId?: string | null;
}

/**
 * Starts many process instances in one RPC (G2).
 */
export class BatchStartProcessDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  templateId!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  tenantId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  createdBy?: number;

  /**
   * When true (or when items exceed server threshold), the request is enqueued
   * and returns immediately.
   */
  @IsOptional()
  @IsBoolean()
  async?: boolean;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => BatchStartProcessItemDto)
  items!: BatchStartProcessItemDto[];
}

