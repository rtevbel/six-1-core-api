import { IsInt, IsOptional, Min } from 'class-validator';
export { CreateConfigFieldDto } from './create-config-field.dto';
export { UpdateConfigFieldDto } from './update-config-field.dto';
export { DeleteConfigFieldDto } from './delete-config-field.dto';

/**
 * List DTO for configuration fields.
 *
 * Used to fetch all `config_object_fields` definitions for a given
 * config object and tenant.
 */
export class ListConfigFieldsDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsInt()
  @Min(1)
  configObjectId!: number;
}

