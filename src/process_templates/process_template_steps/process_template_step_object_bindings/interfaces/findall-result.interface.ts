import { ProcessTemplateStepObjectBindingEntity } from '../entities/process_template_step_object_binding.entity';
import type { RuntimeV2ListPagination } from '../../../../common/runtime-v2-list-pagination';

export interface FindAllResultInterface {
  items: ProcessTemplateStepObjectBindingEntity[];
  processTemplateStepObjectBindingRecords: ProcessTemplateStepObjectBindingEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pagination: RuntimeV2ListPagination;
}
