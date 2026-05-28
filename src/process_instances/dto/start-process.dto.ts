import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  Min,
  Validate,
} from 'class-validator';
import { IsProcessSubjectTypeConstraint } from '../validators/is-process-subject-type.validator';

/**
 * Starts a process via ProcessLifecycleFacade (true start semantics).
 */
export class StartProcessDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  templateId!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  tenantId!: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  createdBy!: number;

  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9_]*$/)
  @Validate(IsProcessSubjectTypeConstraint)
  subjectType!: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  subjectId!: number;

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

