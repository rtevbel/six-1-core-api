import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DeleteResult, UpdateResult } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { ResourceEntity } from '../entities/resource.entity';
import { CreateResourceDto } from '../dto/create-resource.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import { FiltersResourceDto } from '../dto/filters-resource.dto';
import { NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE, NO_RECORD_FOUND_MESSAGE } from '../../common/constants';

export interface FindAllResourcesResultInterface {
  resourceRecords: ResourceEntity[];
  pagination: { total: number; page: number; limit: number };
}

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(ResourceEntity)
    private readonly repo: Repository<ResourceEntity>,
  ) {}

  /**
   * Creates a new resource.
   * @param userId - ID of the user creating the record.
   * @param createDto - Data Transfer Object containing resource details.
   * @returns The created ResourceEntity.
   */
  async create(userId: number, createDto: CreateResourceDto): Promise<ResourceEntity> {
    return await this.repo.save(this.repo.create(createDto));
  }

  /**
   * Retrieves all resources with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of resources and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersResourceDto,
  ): Promise<FindAllResourcesResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);
    const [items, total] = await this.repo.findAndCount(findQuery);

    if (!items.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ResourceEntity.name,
        ),
      );
    }

    return {
      resourceRecords: items,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single resource by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the resource to retrieve.
   * @returns The ResourceEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<ResourceEntity> {
    const resource = await this.repo.findOne({
      where: { resourceId: id },
      relations: ['tenant', 'tenantUser'],
    });

    if (!resource) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', ResourceEntity.name),
      );
    }

    return resource;
  }

  /**
   * Updates an existing resource record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the resource to update.
   * @param updateDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateResourceDto,
  ): Promise<UpdateResult> {
    const resource = await this.repo.findOne({ where: { resourceId: id } });

    if (!resource) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', ResourceEntity.name),
      );
    }

    return await this.repo.update(id, updateDto);
  }

  /**
   * Deletes a resource record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the resource to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.repo.delete({ resourceId: id });
  }

  /**
   * Builds a TypeORM find query based on provided filters.
   * @private
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns A query object for TypeORM.
   */
  private buildFindQuery(filtersDto: FiltersResourceDto): Record<string, any> {
    const query: Record<string, any> = {};
    query.relations = ['tenant', 'tenantUser'];
    query.where = {};

    if (filtersDto.tenantId) {
      query.where.tenantId = filtersDto.tenantId;
    }

    if (filtersDto.tenantUserId) {
      query.where.tenantUserId = filtersDto.tenantUserId;
    }

    if (filtersDto.type) {
      query.where.type = filtersDto.type;
    }

    if (filtersDto.search) {
      query.where = [
        { name: Like(`%${filtersDto.search}%`), ...query.where },
        { description: Like(`%${filtersDto.search}%`), ...query.where },
      ];
    }

    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page || 1;
      filtersDto.limit = Math.min(filtersDto.limit, 10);
      query.take = filtersDto.limit;
      query.skip = (filtersDto.page - 1) * filtersDto.limit;
    }

    return query;
  }

  /**
   * Builds pagination details based on filters and total count.
   * @private
   * @param filtersDto - Filters for pagination.
   * @param total - Total number of records matching the filters.
   * @returns An object containing pagination details.
   */
  private buildPagination(
    filtersDto: FiltersResourceDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filtersDto.page || 1,
      limit: filtersDto.limit || 10,
    };
  }
}

