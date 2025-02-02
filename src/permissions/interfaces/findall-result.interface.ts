import { PermissionEntity } from '../entities/permission.entity';

/**
 * Interface for the result of a find-all operation for permissions.
 * 
 * @version 1.0.0
 * 
 * This interface defines the structure of the result returned by 
 * the operation that retrieves all permissions, including pagination
 * details for the result set.
 */
export interface findAllResultInterface {
  
  /**
   * List of permissions returned from the find-all operation.
   * 
   * @example [
   *   { permission_id: 1, name: "View Orders", is_active: true },
   *   { permission_id: 2, name: "Edit Products", is_active: false }
   * ]
   * 
   * @type {PermissionEntity[]}
   */
  permissions: PermissionEntity[];

  /**
   * Pagination details for the result set.
   * 
   * Includes information on the total number of records, the current 
   * page, and the number of records per page.
   * 
   * @example { total: 100, page: 1, limit: 10 }
   * 
   * @type {Object}
   * @property {number} total - Total number of permissions available.
   * @property {number} page - The current page number of the result set.
   * @property {number} limit - The number of records per page.
   */
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
