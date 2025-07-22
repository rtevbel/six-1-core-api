import { TenantEntity } from '../entities/tenant.entity';

/**
 * Interface for the result of a findAll operation.
 * @version 0.0.1
 * Represents the structure of the response containing roles and pagination details.
 */
export interface FindAllResultInterface {
  /**
   * Array of TenantEntity objects representing the roles.
   */
  tenants: TenantEntity[];

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
  };
}
