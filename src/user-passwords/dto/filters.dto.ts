import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';

/**
 * Filter dto class.
 *
 * Version:1.0.0.
 *
 * This data transfer class is used to,
 * validate filter params.
 */
export class FiltersDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Max(10)
  limit?: number = 10;

  @IsOptional()
  @IsIn(['password_id', 'ip_address', 'user_id'], {
    message:
      'sortBy key must be from this list(password_id,ip_address,user_id)',
  })
  sortBy?: string = 'user_id';

  @IsOptional()
  @IsIn(['ASC', 'DESC'], {
    message: 'sortOrder key must be from this list(ASC,DESC)',
  })
  sortOrder?: string = 'DESC';
}
