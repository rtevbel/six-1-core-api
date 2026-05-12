import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Create DTO for configuration fields.
 *
 * Used by admin APIs to define a new dynamic field on a `config_objects`
 * definition. For tenant-level configuration `tenantId` should be provided;
 * for system-level configuration it may be omitted and derived from context.
 */
export class CreateConfigFieldDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  configObjectId!: number;

  @IsInt()
  @Min(1)
  createdBy!: number;

  /**
   * Logical storage key for meta JSON paths and manifests.
   * Persisted normalized: trimmed, lowercased, whitespace replaced with underscores.
   */
  @IsString()
  @IsNotEmpty()
  fieldKey!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsNotEmpty()
  fieldType!: string;

  @IsObject()
  @IsOptional()
  validationJson?: Record<string, unknown> | null;

  @IsOptional()
  defaultValue?: unknown | null;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;

  @IsInt()
  @IsOptional()
  orderIndex?: number;

  @IsString()
  @IsOptional()
  sectionKey?: string | null;
}

