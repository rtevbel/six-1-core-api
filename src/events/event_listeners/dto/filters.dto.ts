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
  /*
   * ID of the event to filter listeners by.
   * Optional field, must be a number if provided.
   * If not provided, all listeners for all events will be returned.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  eventId?: number;

  /**
   * Search keyword for filtering results.
   * Optional field with a maximum length of 100 characters.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;


  /**
   * Filter by active status.
   * Optional field, must be a boolean if provided.
   */
  @IsOptional()
  @IsIn([true, false], {
    message: 'isActive must be a boolean value (true or false)',
  })
  isActive?: boolean;

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
   * Optional field, defaults to 'listenerId','eventId','channelId'.
   * Must be one of 'listenerId','eventId','channelId'.
   */
  @IsOptional()
  @IsIn(['listenerId','eventId','channelId'], {
    message: 'sortBy key must be from this list (listenerId,eventId,channelId)',
  })
  @IsString()
  sortBy: string = 'listenerId';

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
