import { IsOptional } from 'class-validator';

/**
 * Request payload for `v0.1_get_reference_list_catalog`.
 * Reserved for future tenant-scoped catalog filtering.
 */
export class GetReferenceListCatalogDto {
  @IsOptional()
  tenantId?: number | null;
}
