import { IsOptional, IsString } from 'class-validator';

/**
 * Request payload for `v0.1_get_reference_list_catalog`.
 *
 * - Omit both `dataRef` and `entityKey` → full catalog (`entries[]`).
 * - Provide `dataRef` (e.g. `core.system_status.list`) → resolved lookup slice
 *   with `entityKey` + `entry` for gateway/mobile pickers.
 */
export class GetReferenceListCatalogDto {
  @IsOptional()
  tenantId?: number | null;

  @IsOptional()
  @IsString()
  dataRef?: string;

  @IsOptional()
  @IsString()
  entityKey?: string;
}
