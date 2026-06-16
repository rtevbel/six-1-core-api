import type { ProcessTemplateStepAssigneeEntity } from '../entities/process_template_step_assignee.entity';

export interface FindAllResultInterface {
  records: ProcessTemplateStepAssigneeEntity[];
  total: number;
}
