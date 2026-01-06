import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteResult,
  Repository,
  SelectQueryBuilder,
  UpdateResult,
} from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { SharedProjectEntity } from '../entities/shared_project.entity';
import { CreateSharedProjectDto } from '../dto/shared-projects/create-shared-project.dto';
import { UpdateSharedProjectDto } from '../dto/shared-projects/update-shared-project.dto';
import { FiltersSharedProjectDto } from '../dto/shared-projects/filters-shared-project.dto';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../../common/constants';

export interface FindAllSharedProjectsResult {
  sharedProjects: SharedProjectEntity[];
  pagination: { total: number; page: number; limit: number };
}

@Injectable()
export class SharedProjectsService {
  constructor(
    @InjectRepository(SharedProjectEntity)
    private readonly repo: Repository<SharedProjectEntity>,
  ) {}

  /**
   * Creates a new shared project record.
   * @param userId - ID of the user creating the record.
   * @param dto - DTO containing shared project configuration.
   * @returns The created shared project entity.
   */
  async create(
    userId: number,
    dto: CreateSharedProjectDto,
  ): Promise<SharedProjectEntity> {
    return await this.repo.save(this.repo.create(dto));
  }

  /**
   * Retrieves shared projects with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filters - Filters for querying shared projects.
   * @returns An object containing the list of shared projects and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filters: FiltersSharedProjectDto,
  ): Promise<FindAllSharedProjectsResult> {
    const qb = this.buildQuery(filters);
    const [items, total] = await qb.getManyAndCount();

    if (!items.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          SharedProjectEntity.name,
        ),
      );
    }

    return {
      sharedProjects: items,
      pagination: this.buildPagination(filters, total),
    };
  }

  /**
   * Retrieves a single shared project by sharing ID.
   * @param userId - ID of the user requesting the data.
   * @param sharingId - Sharing ID of the project to retrieve.
   * @returns The shared project entity.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    sharingId: number,
  ): Promise<SharedProjectEntity> {
    const record = await this.repo.findOne({
      where: { sharingId },
      relations: ['project', 'sharedByTenant', 'sharedWithTenant'],
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SharedProjectEntity.name,
        ),
      );
    }

    return record;
  }

  /**
   * Updates an existing shared project record.
   * @param userId - ID of the user updating the record.
   * @param sharingId - Sharing ID of the project to update.
   * @param dto - DTO containing updated fields.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    sharingId: number,
    dto: UpdateSharedProjectDto,
  ): Promise<UpdateResult> {
    const record = await this.repo.findOne({ where: { sharingId } });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SharedProjectEntity.name,
        ),
      );
    }

    return await this.repo.update(sharingId, dto);
  }

  /**
   * Deletes a shared project record by sharing ID.
   * @param userId - ID of the user deleting the record.
   * @param sharingId - Sharing ID of the project to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, sharingId: number): Promise<DeleteResult> {
    return await this.repo.delete({ sharingId });
  }

  private buildQuery(
    filters: FiltersSharedProjectDto,
  ): SelectQueryBuilder<SharedProjectEntity> {
    const qb = this.repo
      .createQueryBuilder('sharedProject')
      .leftJoinAndSelect('sharedProject.project', 'project')
      .leftJoinAndSelect('sharedProject.sharedByTenant', 'sharedByTenant')
      .leftJoinAndSelect('sharedProject.sharedWithTenant', 'sharedWithTenant');

    if (filters.projectId) {
      qb.andWhere('sharedProject.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }

    if (filters.sharedByTenantId) {
      qb.andWhere('sharedProject.sharedByTenantId = :sharedByTenantId', {
        sharedByTenantId: filters.sharedByTenantId,
      });
    }

    if (filters.sharedWithTenantId) {
      qb.andWhere('sharedProject.sharedWithTenantId = :sharedWithTenantId', {
        sharedWithTenantId: filters.sharedWithTenantId,
      });
    }

    if (filters.permissionLevel) {
      qb.andWhere('sharedProject.permissionLevel = :permissionLevel', {
        permissionLevel: filters.permissionLevel,
      });
    }

    if (filters.sharingStatus) {
      qb.andWhere('sharedProject.sharingStatus = :sharingStatus', {
        sharingStatus: filters.sharingStatus,
      });
    }

    if (filters.sortBy) {
      qb.orderBy(
        `sharedProject.${filters.sortBy}`,
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
    filters: FiltersSharedProjectDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filters.page || 1,
      limit: filters.limit || 10,
    };
  }
}
