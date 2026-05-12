import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Resolves list filter/sort catalog for any configurable object type.
 *
 * Gateway routes here with `tenantId` + canonical `objectType` (`customer`, `project`, …).
 */
export class GetObjectListFieldCatalogDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;
}
