import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult, UpdateResult } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { ResourceAssignmentEntity } from '../entities/resource_assignment.entity';
import { CreateResourceAssignmentDto } from '../dto/create-resource-assignment.dto';
import { UpdateResourceAssignmentDto } from '../dto/update-resource-assignment.dto';
import { FiltersResourceAssignmentDto } from '../dto/filters-resource-assignment.dto';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../../common/constants';

export interface FindAllResourceAssignmentsResultInterface {
  resourceAssignmentRecords: ResourceAssignmentEntity[];
  pagination: { total: number; page: number; limit: number };
}

@Injectable()
export class ResourceAssignmentsService {
  constructor(
    @InjectRepository(ResourceAssignmentEntity)
    private readonly repo: Repository<ResourceAssignmentEntity>,
  ) {}

  /**
   * Creates a new resource assignment.
   * @param userId - ID of the user creating the record.
   * @param createDto - Data Transfer Object containing resource assignment details.
   * @returns The created ResourceAssignmentEntity.
   */
  async create(
    userId: number,
    createDto: CreateResourceAssignmentDto,
  ): Promise<ResourceAssignmentEntity> {
    return await this.repo.save(this.repo.create(createDto));
  }

  /**
   * Retrieves all resource assignments with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of resource assignments and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersResourceAssignmentDto,
  ): Promise<FindAllResourceAssignmentsResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);
    const [items, total] = await this.repo.findAndCount(findQuery);

    if (!items.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ResourceAssignmentEntity.name,
        ),
      );
    }

    return {
      resourceAssignmentRecords: items,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single resource assignment by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the resource assignment to retrieve.
   * @returns The ResourceAssignmentEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<ResourceAssignmentEntity> {
    const assignment = await this.repo.findOne({
      where: { resourceAssignmentId: id },
      relations: ['resource', 'scheduledTask'],
    });

    if (!assignment) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ResourceAssignmentEntity.name,
        ),
      );
    }

    return assignment;
  }

  /**
   * Updates an existing resource assignment record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the resource assignment to update.
   * @param updateDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateResourceAssignmentDto,
  ): Promise<UpdateResult> {
    const assignment = await this.repo.findOne({
      where: { resourceAssignmentId: id },
    });

    if (!assignment) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ResourceAssignmentEntity.name,
        ),
      );
    }

    return await this.repo.update(id, updateDto);
  }

  /**
   * Deletes a resource assignment record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the resource assignment to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.repo.delete({ resourceAssignmentId: id });
  }

  /**
   * Validates that resource assignments exist.
   * @param ids - Array of resource assignment IDs to validate.
   * @returns Array of found resource assignments.
   * @throws RpcException if any assignment is not found.
   */
  async validateExistence(ids: number[]): Promise<ResourceAssignmentEntity[]> {
    if (!ids.length) return [];
    const found = await this.repo.findByIds(ids);
    if (found.length !== ids.length) {
      const foundIds = new Set(found.map((a) => a.resourceAssignmentId));
      const missing = ids.filter((id) => !foundIds.has(id));
      throw new RpcException(
        `Resource assignments not found: ${missing.join(', ')}`,
      );
    }
    return found;
  }

  /**
   * Builds a TypeORM find query based on provided filters.
   * @private
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns A query object for TypeORM.
   */
  private buildFindQuery(
    filtersDto: FiltersResourceAssignmentDto,
  ): Record<string, any> {
    const query: Record<string, any> = {};
    query.relations = ['resource', 'scheduledTask'];
    query.where = {};

    if (filtersDto.resourceId) {
      query.where.resourceId = filtersDto.resourceId;
    }

    if (filtersDto.scheduledTaskId) {
      query.where.scheduledTaskId = filtersDto.scheduledTaskId;
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
    filtersDto: FiltersResourceAssignmentDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filtersDto.page || 1,
      limit: filtersDto.limit || 10,
    };
  }
}
