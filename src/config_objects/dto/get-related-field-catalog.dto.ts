import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO for the related-field catalog RPC (fields on the `toObjectType` of a relationship).
 */
export class GetRelatedFieldCatalogDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  fromObjectType!: string;

  @IsString()
  @IsNotEmpty()
  relationshipKey!: string;
}
