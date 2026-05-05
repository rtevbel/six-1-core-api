import { RoleEntity } from '../entities/role.entity';

/**
 * Interface for the result of a findAll operation.
 * @version 0.0.1
 * Represents the structure of the response containing roles and pagination details.
 */
export interface FindAllResultInterface {
  /** Standardized paginated payload. */
  items: RoleEntity[];

  /** Backward-compatible alias of `items`. */
  roles: RoleEntity[];

  page: number;
  limit: number;
  total: number;
  totalPages: number;

  /**
   * Pagination details for the result set.
   */
  pagination: {
    /**
     * Total number of records available.
     */
    total: number;

    /**
     * Current page number.
     */
    page: number;

    /**
     * Number of records per page.
     */
    limit: number;

    /** Total available pages for the query. */
    totalPages: number;
  };
}
