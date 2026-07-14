import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * List runtime field metadata overlays for a `system_table` config object.
 */
export class ListRuntimeFieldMetadataDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;
}

/**
 * Create or update one runtime field metadata overlay.
 */
export class UpsertRuntimeFieldMetadataDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @IsString()
  @IsNotEmpty()
  fieldKey!: string;

  @IsObject()
  validationJson!: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  rulesJson?: Record<string, unknown> | null;

  @IsInt()
  @Min(1)
  updatedBy!: number;
}

/**
 * Remove a runtime field metadata overlay.
 */
export class DeleteRuntimeFieldMetadataDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @IsString()
  @IsNotEmpty()
  fieldKey!: string;

  @IsInt()
  @Min(1)
  deletedBy!: number;
}
