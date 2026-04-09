import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
export { CreateConfigViewDto } from './create-config-view.dto';
export { UpdateConfigViewDto } from './update-config-view.dto';
export { DeleteConfigViewDto } from './delete-config-view.dto';

/**
 * List DTO for configuration views.
 *
 * Used to fetch all `config_object_views` for a given tenant and object type.
 * For tenant-level configuration `tenantId` should be provided; for
 * system-level configuration it may be omitted and derived from context.
 */
export class ListConfigViewsDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  objectType!: string;
}

