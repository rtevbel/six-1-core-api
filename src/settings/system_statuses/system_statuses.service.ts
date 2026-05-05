import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SystemStatusEntity } from './entities/system-status.entity';
import { CreateSystemStatusDto } from './dto/create-system-status.dto';
import { UpdateSystemStatusDto } from './dto/update-system-status.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';

@Injectable()
export class SystemStatusesService {
  constructor(
    @InjectRepository(SystemStatusEntity)
    private readonly systemStatusesRepository: Repository<SystemStatusEntity>,
  ) {}

  /**
   * Creates a new system status record.
   * @param userId - ID of the user creating the record.
   * @param createSystemStatusDto - Data Transfer Object containing status details.
   * @returns The created SystemStatusEntity.
   */
  async create(
    userId: number,
    createSystemStatusDto: CreateSystemStatusDto,
  ): Promise<SystemStatusEntity> {
    return await this.systemStatusesRepository.save(
      this.systemStatusesRepository.create(createSystemStatusDto),
    );
  }

  /**
   * Retrieves all system statuses with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of statuses and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    // Fetch statuses and count total records
    const [statuses, total] =
      await this.systemStatusesRepository.findAndCount(findQuery);

    // Throw exception if no records are found
    if (statuses.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          SystemStatusEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: statuses,
      statuses: statuses,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single system status by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the status to retrieve.
   * @returns The SystemStatusEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<SystemStatusEntity> {
    const status = await this.systemStatusesRepository.findOneByOrFail({
      status_id: id,
    });

    if (!status) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          SystemStatusEntity.name,
        ),
      );
    }

    return status;
  }

  /**
   * Updates an existing system status record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the status to update.
   * @param updateSystemStatusDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateSystemStatusDto: UpdateSystemStatusDto,
  ): Promise<UpdateResult> {
    const status = await this.systemStatusesRepository.findOneByOrFail({
      status_id: id,
    });

    if (!status) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          SystemStatusEntity.name,
        ),
      );
    }

    return await this.systemStatusesRepository.update(
      id,
      updateSystemStatusDto,
    );
  }

  /**
   * Deletes a system status record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the status to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.systemStatusesRepository.delete({ status_id: id });
  }

  /**
   * Builds the query object for filtering, sorting, and pagination.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns The query object for TypeORM's `findAndCount` method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    // Apply search filters if provided
    if (filtersDto.search) {
      query.where = [
        { name: Like(`%${filtersDto.search}%`) },
        { code: Like(`%${filtersDto.search}%`) },
      ];
    }

    // Apply sorting if provided
    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    // Apply pagination if limit is provided
    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page || 1;
      filtersDto.limit = Math.min(filtersDto.limit, 10);

      query.take = filtersDto.limit;
      query.skip = (filtersDto.page - 1) * filtersDto.limit;
    }

    return query;
  }

  /**
   * Builds the pagination object for the response.
   * @param filtersDto - Filters containing pagination details.
   * @param total - Total number of records matching the query.
   * @returns The pagination object.
   */
  private buildPagination(
    filtersDto: any,
    total: number,
  ): RuntimeV2ListPagination {
    return buildRuntimeV2ListPagination(
      filtersDto.page,
      filtersDto.limit,
      total,
      10,
    );
  }
}
