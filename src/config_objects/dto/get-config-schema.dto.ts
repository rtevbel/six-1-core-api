import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ConfigObjectStatus } from '../entities/config_object.entity';

/**
 * DTO used to request a configuration schema for a given object type.
 *
 * For tenant-scoped configuration `tenantId` should be provided; for
 * system-level (superadmin / global template-set management) it may be
 * omitted and derived from auth context.
 *
 * The handler response adds Object Runner fields (`runnerKind`, `supportsCustomFields`,
 * `resolveInstanceWith`, `fieldSchemaSource`, `fieldRegistry`, `fieldMergePolicy`,
 * `sorFieldDescriptors`, `mergedFieldOrder`) — see `ConfigObjectRunnerSchemaView`.
 */
export class GetConfigSchemaDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  configObjectId?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  updatedBy?: number;

  @IsString()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'CONFLICT'])
  @IsOptional()
  status?: ConfigObjectStatus;

  @IsString()
  @IsNotEmpty()
  objectType!: string;
}

