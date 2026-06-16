import { ProcessTemplateStepActionEntity } from '../entities/process_template_step_action.entity';

export interface FindAllResultInterface {
  items: ProcessTemplateStepActionEntity[];
  processTemplateStepActionRecords: ProcessTemplateStepActionEntity[];
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
