import { ProcessInstanceStepRequirementSubmissionEntity } from '../entities/process_instance_step_requirement_submission.entity';

export interface FindAllResultInterface {
  items: ProcessInstanceStepRequirementSubmissionEntity[];
  submissions: ProcessInstanceStepRequirementSubmissionEntity[];
  processTemplateStepRequirementSubmissionRecords: ProcessInstanceStepRequirementSubmissionEntity[];
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
