import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteResult,
  Repository,
  SelectQueryBuilder,
  UpdateResult,
} from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { SharedTaskEntity } from '../entities/shared_task.entity';
import { CreateSharedTaskDto } from '../dto/shared-tasks/create-shared-task.dto';
import { UpdateSharedTaskDto } from '../dto/shared-tasks/update-shared-task.dto';
import { FiltersSharedTaskDto } from '../dto/shared-tasks/filters-shared-task.dto';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../../common/constants';

export interface FindAllSharedTasksResult {
  sharedTasks: SharedTaskEntity[];
  pagination: { total: number; page: number; limit: number };
}

@Injectable()
export class SharedTasksService {
  constructor(
    @InjectRepository(SharedTaskEntity)
    private readonly repo: Repository<SharedTaskEntity>,
  ) {}

  /**
   * Creates a new shared task record.
   * @param userId - ID of the user creating the record.
   * @param dto - DTO containing shared task configuration.
   * @returns The created shared task entity.
   */
  async create(
    userId: number,
    dto: CreateSharedTaskDto,
  ): Promise<SharedTaskEntity> {
    return await this.repo.save(this.repo.create(dto));
  }

  /**
   * Retrieves shared tasks with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filters - Filters for querying shared tasks.
   * @returns An object containing the list of shared tasks and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filters: FiltersSharedTaskDto,
  ): Promise<FindAllSharedTasksResult> {
    const qb = this.buildQuery(filters);
    const [items, total] = await qb.getManyAndCount();

    if (!items.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          SharedTaskEntity.name,
        ),
      );
    }

    return {
      sharedTasks: items,
      pagination: this.buildPagination(filters, total),
    };
  }

  /**
   * Retrieves a single shared task by sharing ID.
   * @param userId - ID of the user requesting the data.
   * @param sharingId - Sharing ID of the task to retrieve.
   * @returns The shared task entity.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, sharingId: number): Promise<SharedTaskEntity> {
    const record = await this.repo.findOne({
      where: { sharingId },
      relations: ['task', 'sharedByTenant', 'sharedWithTenant'],
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SharedTaskEntity.name,
        ),
      );
    }

    return record;
  }

  /**
   * Updates an existing shared task record.
   * @param userId - ID of the user updating the record.
   * @param sharingId - Sharing ID of the task to update.
   * @param dto - DTO containing updated fields.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    sharingId: number,
    dto: UpdateSharedTaskDto,
  ): Promise<UpdateResult> {
    const record = await this.repo.findOne({ where: { sharingId } });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SharedTaskEntity.name,
        ),
      );
    }

    return await this.repo.update(sharingId, dto);
  }

  /**
   * Deletes a shared task record by sharing ID.
   * @param userId - ID of the user deleting the record.
   * @param sharingId - Sharing ID of the task to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, sharingId: number): Promise<DeleteResult> {
    return await this.repo.delete({ sharingId });
  }

  private buildQuery(
    filters: FiltersSharedTaskDto,
  ): SelectQueryBuilder<SharedTaskEntity> {
    const qb = this.repo
      .createQueryBuilder('sharedTask')
      .leftJoinAndSelect('sharedTask.task', 'task')
      .leftJoinAndSelect('sharedTask.sharedByTenant', 'sharedByTenant')
      .leftJoinAndSelect('sharedTask.sharedWithTenant', 'sharedWithTenant');

    if (filters.taskId) {
      qb.andWhere('sharedTask.taskId = :taskId', { taskId: filters.taskId });
    }

    if (filters.sharedByTenantId) {
      qb.andWhere('sharedTask.sharedByTenantId = :sharedByTenantId', {
        sharedByTenantId: filters.sharedByTenantId,
      });
    }

    if (filters.sharedWithTenantId) {
      qb.andWhere('sharedTask.sharedWithTenantId = :sharedWithTenantId', {
        sharedWithTenantId: filters.sharedWithTenantId,
      });
    }

    if (filters.permissionLevel) {
      qb.andWhere('sharedTask.permissionLevel = :permissionLevel', {
        permissionLevel: filters.permissionLevel,
      });
    }

    if (filters.sharingStatus) {
      qb.andWhere('sharedTask.sharingStatus = :sharingStatus', {
        sharingStatus: filters.sharingStatus,
      });
    }

    if (filters.sortBy) {
      qb.orderBy(
        `sharedTask.${filters.sortBy}`,
        (filters.sortOrder || 'ASC') as 'ASC' | 'DESC',
      );
    }

    if (filters.limit) {
      const limit = Math.min(filters.limit, 25);
      const page = filters.page || 1;
      qb.take(limit);
      qb.skip((page - 1) * limit);
      filters.limit = limit;
      filters.page = page;
    }

    return qb;
  }

  private buildPagination(
    filters: FiltersSharedTaskDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filters.page || 1,
      limit: filters.limit || 10,
    };
  }
}
