import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * FiltersDto class for handling query parameters.
 * @version 1.0.1
 * This class validates and transforms query parameters
 * used for filtering, sorting, and pagination.
 */
export class FiltersDto {
  /**
   * Tenant Team ID for filtering results.
   * Optional field, must be a number if provided.
   * @example 123
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenantTeamId!: number;
  /**
   * Search keyword for filtering results.
   * Optional field with a maximum length of 100 characters.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  /**
   * Page number for pagination.
   * Optional field, defaults to 1.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page: number = 1;

  /**
   * Limit for the number of results per page.
   * Optional field, defaults to 10.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit: number = 10;

  /**
   * Field to sort the results by.
   * Optional field, defaults to 'teamProjectId'.
   * Must be one of 'teamProjectId', tenantTeamId , 'projectId'.
   */
  @IsOptional()
  @IsIn(['teamProjectId', 'tenantTeamId', 'projectId'], {
    message:
      'sortBy key must be from this list (teamProjectId, tenantTeamId , projectId)',
  })
  @IsString()
  sortBy: string = 'teamProjectId';

  /**
   * Sort order for the results.
   * Optional field, defaults to 'DESC'.
   * Must be one of 'ASC' or 'DESC'.
   */
  @IsOptional()
  @IsIn(['ASC', 'DESC'], {
    message: "sortOrder key must be from this list ('ASC', 'DESC')",
  })
  @IsString()
  sortOrder: string = 'DESC';
}
