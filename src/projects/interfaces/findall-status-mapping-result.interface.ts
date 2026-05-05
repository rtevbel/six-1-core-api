import { ProjectStepStatusMappingEntity } from '../entities/project_step_status_mappings.entity';

/**
 * Runtime v2 list envelope (items + legacy array + top-level paging).
 */
export interface FindAllStatusMappingResultInterface {
  items: ProjectStepStatusMappingEntity[];
  projectStepStatusMappingRecords: ProjectStepStatusMappingEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
