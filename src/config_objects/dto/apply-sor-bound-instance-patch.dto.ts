import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Applies allowlisted SoR column updates and `*_meta` JSON patches in one
 * transaction for `sor_bound` configurable objects (Object Runner save).
 *
 * Gateway must enforce domain permissions (e.g. `projects.update`) before proxying.
 *
 * **`tenantId` (optional):** When omitted (super-admin / global scope), only
 * `metaPatch` is allowed and field keys are resolved from the global published
 * template set. Core column updates on tenant-owned rows (`project`, `task`,
 * `resource`) require `tenantId >= 1`.
 */
export class ApplySorBoundInstancePatchDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  coreId!: number;

  /**
   * Partial core row keyed by entity property names (see `sorFieldDescriptors` on schema).
   */
  @IsOptional()
  @IsObject()
  corePatch?: Record<string, unknown>;

  /**
   * Partial meta JSON keyed by `config_object_fields.field_key`.
   */
  @IsOptional()
  @IsObject()
  metaPatch?: Record<string, unknown>;

  /**
   * When `objectType` is `customer_contact`, must match the row’s `customerId` when provided.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  customerId?: number;
}
