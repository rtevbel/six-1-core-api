import type { CategoryEntity } from '../entities/category.entity';
import type { RuntimeV2ListPagination } from '../../common/runtime-v2-list-pagination';

/**
 * List RPC response envelope for categories (runtime v2), aligned with gateway
 * `CustomerListResponseDto` and core-api customers `FindAllResultInterface`.
 *
 * Requires `items` plus top-level `page`, `limit`, `total`, `totalPages`, and echoes the same metrics under `pagination`.
 */
export interface CategoryListResponseDto {
  items: CategoryEntity[];
  /**
   * Mirror of {@link CategoryListResponseDto.items} for backward compatibility until clients migrate.
   */
  categoryRecords: CategoryEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pagination: RuntimeV2ListPagination;
}
