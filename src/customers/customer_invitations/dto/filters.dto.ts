import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { CatalogDynamicListFiltersMixin } from '../../../common/dto/catalog-dynamic-list-filter.dto';

const STATUS_VALUES = ['pending', 'accepted', 'declined'] as const;

export class FiltersDto extends CatalogDynamicListFiltersMixin {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  projectId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taskId?: number;

  @IsOptional()
  @IsEnum(STATUS_VALUES)
  status?: (typeof STATUS_VALUES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_]+$/)
  sortBy: string = 'invitationId';
}
