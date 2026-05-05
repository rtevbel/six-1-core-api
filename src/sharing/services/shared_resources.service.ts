import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {  DeleteResult,
  Repository,
  SelectQueryBuilder,
  UpdateResult,
} from 'typeorm';

import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import { RpcException } from '@nestjs/microservices';
import { SharedResourceEntity } from '../entities/shared_resource.entity';
import { CreateSharedResourceDto } from '../dto/shared-resources/create-shared-resource.dto';
import { UpdateSharedResourceDto } from '../dto/shared-resources/update-shared-resource.dto';
import { FiltersSharedResourceDto } from '../dto/shared-resources/filters-shared-resource.dto';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../../common/constants';

export interface FindAllSharedResourcesResult {
  items: SharedResourceEntity[];
  sharedResources: SharedResourceEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  pagination: RuntimeV2ListPagination;
}

@Injectable()
export class SharedResourcesService {
  constructor(
    @InjectRepository(SharedResourceEntity)
    private readonly repo: Repository<SharedResourceEntity>,
  ) {}

  /**
   * Creates a new shared resource record.
   * @param userId - ID of the user creating the record.
   * @param dto - DTO containing shared resource configuration.
   * @returns The created shared resource entity.
   */
  async create(
    userId: number,
    dto: CreateSharedResourceDto,
  ): Promise<SharedResourceEntity> {
    return await this.repo.save(this.repo.create(dto));
  }

  /**
   * Retrieves shared resources with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filters - Filters for querying shared resources.
   * @returns An object containing the list of shared resources and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filters: FiltersSharedResourceDto,
  ): Promise<FindAllSharedResourcesResult> {
    const qb = this.buildQuery(filters);
    const [items, total] = await qb.getManyAndCount();

    if (!items.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          SharedResourceEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filters, total);
    return {
      items: items,
      sharedResources: items,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single shared resource by sharing ID.
   * @param userId - ID of the user requesting the data.
   * @param sharingId - Sharing ID of the resource to retrieve.
   * @returns The shared resource entity.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    sharingId: number,
  ): Promise<SharedResourceEntity> {
    const record = await this.repo.findOne({
      where: { sharingId },
      relations: ['resource', 'sharedByTenant', 'sharedWithTenant'],
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SharedResourceEntity.name,
        ),
      );
    }

    return record;
  }

  /**
   * Updates an existing shared resource record.
   * @param userId - ID of the user updating the record.
   * @param sharingId - Sharing ID of the resource to update.
   * @param dto - DTO containing updated fields.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    sharingId: number,
    dto: UpdateSharedResourceDto,
  ): Promise<UpdateResult> {
    const record = await this.repo.findOne({ where: { sharingId } });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SharedResourceEntity.name,
        ),
      );
    }

    return await this.repo.update(sharingId, dto);
  }

  /**
   * Deletes a shared resource record by sharing ID.
   * @param userId - ID of the user deleting the record.
   * @param sharingId - Sharing ID of the resource to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, sharingId: number): Promise<DeleteResult> {
    return await this.repo.delete({ sharingId });
  }

  private buildQuery(
    filters: FiltersSharedResourceDto,
  ): SelectQueryBuilder<SharedResourceEntity> {
    const qb = this.repo
      .createQueryBuilder('sharedResource')
      .leftJoinAndSelect('sharedResource.resource', 'resource')
      .leftJoinAndSelect('sharedResource.sharedByTenant', 'sharedByTenant')
      .leftJoinAndSelect('sharedResource.sharedWithTenant', 'sharedWithTenant');

    if (filters.resourceId) {
      qb.andWhere('sharedResource.resourceId = :resourceId', {
        resourceId: filters.resourceId,
      });
    }

    if (filters.sharedByTenantId) {
      qb.andWhere('sharedResource.sharedByTenantId = :sharedByTenantId', {
        sharedByTenantId: filters.sharedByTenantId,
      });
    }

    if (filters.sharedWithTenantId) {
      qb.andWhere('sharedResource.sharedWithTenantId = :sharedWithTenantId', {
        sharedWithTenantId: filters.sharedWithTenantId,
      });
    }

    if (filters.permissionLevel) {
      qb.andWhere('sharedResource.permissionLevel = :permissionLevel', {
        permissionLevel: filters.permissionLevel,
      });
    }

    if (filters.sharingStatus) {
      qb.andWhere('sharedResource.sharingStatus = :sharingStatus', {
        sharingStatus: filters.sharingStatus,
      });
    }

    if (filters.sortBy) {
      qb.orderBy(
        `sharedResource.${filters.sortBy}`,
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
    filters: any,
    total: number,
  ): RuntimeV2ListPagination {
    return buildRuntimeV2ListPagination(
      filters.page,
      filters.limit,
      total,
      10,
    );
  }
}
