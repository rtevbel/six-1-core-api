import { ProjectStepStatusMappingEntity } from '../entities/project_step_status_mappings.entity';

/**
 * Interface for the result of a findAll operation.
 * @version 0.0.1
 * Represents the structure of the response containing roles and pagination details.
 */
export interface FindAllStatusMappingResultInterface {
  /**
   * Array of ProjectStepStatusMappingEntity objects representing the roles.
   */
  projectStepStatusMappingRecords: ProjectStepStatusMappingEntity[];

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
