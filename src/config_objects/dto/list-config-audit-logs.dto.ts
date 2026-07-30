import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CONFIG_AUDIT_ENTITY_TYPES } from '../constants/config-audit.constants';

/**
 * List DTO for Object Designer audit history scoped to a config object.
 *
 * Resolves related child entity IDs (fields, views, panels, etc.) server-side
 * so callers only pass `configObjectId` (+ optional filters).
 */
export class ListConfigAuditLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  configObjectId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsIn([...CONFIG_AUDIT_ENTITY_TYPES])
  entityType?: (typeof CONFIG_AUDIT_ENTITY_TYPES)[number];

  @IsOptional()
  @IsIn(['create', 'update', 'delete'])
  action?: 'create' | 'update' | 'delete';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
