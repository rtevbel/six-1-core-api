import type { RuntimeV2ListPagination } from '../../../common/runtime-v2-list-pagination';
import type { PlatformActionEntity } from '../entities/platform_action.entity';
import type { ActionBindingEntity } from '../entities/action_binding.entity';

export interface PlatformActionFindAllResult {
  items: PlatformActionEntity[];
  platformActionRecords: PlatformActionEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pagination: RuntimeV2ListPagination;
}

export interface ActionBindingFindAllResult {
  items: ActionBindingEntity[];
  actionBindingRecords: ActionBindingEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pagination: RuntimeV2ListPagination;
}
