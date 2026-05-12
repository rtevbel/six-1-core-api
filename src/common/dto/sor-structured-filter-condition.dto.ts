import {
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';

/**
 * One structured clause for configurable SoR list APIs (core column, meta JSON, or related EXISTS).
 *
 * Reused across customer/project/task/resource/contact-info list handlers.
 */
export class SorStructuredFilterConditionDto {
  @IsIn(['core', 'meta', 'related'])
  source!: 'core' | 'meta' | 'related';

  @ValidateIf((o: SorStructuredFilterConditionDto) => o.source === 'related')
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Matches(/^[a-z0-9_]+$/)
  relationshipKey?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  field!: string;

  @IsIn(['eq', 'contains', 'gte', 'lte', 'in'])
  operator!: 'eq' | 'contains' | 'gte' | 'lte' | 'in';

  @IsDefined()
  value!: unknown;
}
