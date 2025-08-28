import { ProcessTemplateStepTriggerConditionSubmissionEntity } from '../entities/process_template_step_trigger_condition_submission.entity';

/**
 * Interface for the result of a findAll operation.
 * @version 0.0.1
 * Represents the structure of the response containing roles and pagination details.
 */
export interface FindAllResultInterface {
  /**
   * Array of ProcessTemplateStepTriggerConditionSubmissionEntity objects representing the roles.
   */
  processTemplateStepTriggerConditionSubmissionRecords: ProcessTemplateStepTriggerConditionSubmissionEntity[];

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
