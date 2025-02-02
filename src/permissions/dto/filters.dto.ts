import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Data Transfer Object (DTO) for filtering and pagination.
 * 
 * @version 1.0.0
 * 
 * This DTO is used to define filtering, pagination, and sorting criteria for requests.
 */
export class FiltersDto {
  
  /**
   * Search query string for filtering results.
   * 
   * - Optional field.
   * - Must be a string with a maximum length of 100 characters.
   * 
   * @example "admin"
   * 
   * @type {string | undefined}
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  /**
   * Page number for pagination.
   * 
   * - Optional field.
   * - Must be a number.
   * - Defaults to `1` if not provided.
   * 
   * @example 2
   * 
   * @type {number}
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  /**
   * Limit of items per page for pagination.
   * 
   * - Optional field.
   * - Must be a number.
   * - Defaults to `10` if not provided.
   * 
   * @example 20
   * 
   * @type {number}
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  /**
   * Field used for sorting results.
   * 
   * - Optional field.
   * - Must be one of `permission_id`, `name`, or `description`.
   * - Defaults to `permission_id` if not provided.
   * 
   * @example "name"
   * 
   * @type {string}
   */
  @IsOptional()
  @IsIn(['permission_id', 'name', 'description'], {
    message:
      'sortBy key must be from this list (permission_id, name, description)',
  })
  @IsString()
  sortBy?: string = 'permission_id';

  /**
   * Sorting order.
   * 
   * - Optional field.
   * - Must be either `ASC` (ascending) or `DESC` (descending).
   * - Defaults to `DESC` if not provided.
   * 
   * @example "ASC"
   * 
   * @type {string}
   */
  @IsOptional()
  @IsIn(['ASC', 'DESC'], {
    message: "sortOrder key must be from this list ('ASC', 'DESC')",
  })
  @IsString()
  sortOrder?: string = 'DESC';
}
