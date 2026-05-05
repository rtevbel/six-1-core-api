import { ProcessTemplateStepRequirementSubmissionEntity } from '../entities/process_template_step_requirement_submission.entity';

/**
 * Interface for the result of a findAll operation.
 * @version 0.0.1
 * Represents the structure of the response containing roles and pagination details.
 */

/**
 * Runtime v2 list envelope (items + legacy array + top-level paging).
 */
export interface FindAllResultInterface {
  items: ProcessTemplateStepRequirementSubmissionEntity[];
  /** Backward-compatible alias used by some clients. */
  submissions: ProcessTemplateStepRequirementSubmissionEntity[];
  processTemplateStepRequirementSubmissionRecords: ProcessTemplateStepRequirementSubmissionEntity[];
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
