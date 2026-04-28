import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

type Cardinality = 'one_to_many' | 'many_to_one' | 'many_to_many';

export const CONFIG_RELATIONSHIP_SOURCE_VALUES = ['orm', 'designer'] as const;
export type ConfigRelationshipSource =
  (typeof CONFIG_RELATIONSHIP_SOURCE_VALUES)[number];

/**
 * Create DTO for configuration relationships.
 *
 * Used by admin APIs to define a new relationship between two config
 * object types. For tenant-level configuration `tenantId` should be provided;
 * for system-level configuration it may be omitted and derived from context.
 */
export class CreateConfigRelationshipDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  createdBy!: number;

  @IsString()
  @IsNotEmpty()
  fromObjectType!: string;

  @IsString()
  @IsNotEmpty()
  toObjectType!: string;

  @IsString()
  @IsNotEmpty()
  relationshipKey!: string;

  /** When omitted or whitespace-only, core defaults to `relationshipKey`. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  displayName?: string;

  @IsString()
  @IsNotEmpty()
  cardinality!: Cardinality;

  /** When omitted, core persists `{}` for DB JSON NOT NULL. */
  @IsOptional()
  @IsObject()
  queryConfig?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsIn([...CONFIG_RELATIONSHIP_SOURCE_VALUES])
  relationshipSource?: ConfigRelationshipSource;

  /**
   * Validated on save; persisted as `relation_manifest_json`.
   *
   * Supports lightweight refs (`dataRef`/`actionRef`) and richer authoring metadata
   * (for example `mode`, `targetEntityKey`, `displayMode`, `selectionControl`,
   * `columns`, `queryDefaults`, `actions`) used by relation-membership UIs.
   */
  @IsObject()
  @IsOptional()
  relationManifestsByKey?: Record<string, unknown> | null;
}

