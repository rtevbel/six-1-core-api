import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessInstanceEntity } from './entities/process_instance.entity';
import { CreateProcessInstanceDto } from './dto/create-process_instance.dto';
import { UpdateProcessInstanceDto } from './dto/update-process_instance.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../common/runtime-v2-list-pagination';

@Injectable()
export class ProcessInstancesService {
  constructor(
    @InjectRepository(ProcessInstanceEntity)
    private readonly processInstanceRepository: Repository<ProcessInstanceEntity>,
  ) {}

  /**
   * Creates a new process instance record.
   * @param userId - ID of the user creating the record.
   * @param createProcessInstanceDto - Data Transfer Object containing process instance details.
   * @returns The created ProcessInstanceEntity.
   */
  async create(
    userId: number,
    createProcessInstanceDto: CreateProcessInstanceDto,
  ): Promise<ProcessInstanceEntity> {
    return await this.processInstanceRepository.save(
      this.processInstanceRepository.create(createProcessInstanceDto),
    );
  }

  /**
   * Retrieves all process instances with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of process instances and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [processInstances, total] =
      await this.processInstanceRepository.findAndCount(findQuery);

    if (processInstances.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessInstanceEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: processInstances,
      processInstanceRecords: processInstances,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Builds the query object for filtering, sorting, and pagination.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns The query object for TypeORM's `findAndCount` method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {
      relations: ['processTemplate', 'tenant', 'createdByUser'],
    };

    if (filtersDto.tenantId) {
      query.where = { tenantId: filtersDto.tenantId };
    }

    if (filtersDto.search) {
      query.where = [
        { correlationId: Like(`%${filtersDto.search}%`) },
        { status: Like(`%${filtersDto.search}%`) },
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

  /**
   * Retrieves a single process instance by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the process instance to retrieve.
   * @returns The ProcessInstanceEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<ProcessInstanceEntity> {
    const processInstance = await this.processInstanceRepository.findOne({
      where: { processInstanceId: id },
      relations: ['processTemplate', 'tenant', 'createdByUser'],
    });

    if (!processInstance) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProcessInstanceEntity.name,
        ),
      );
    }

    return processInstance;
  }

  /**
   * Updates an existing process instance record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the process instance to update.
   * @param updateProcessInstanceDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateProcessInstanceDto: UpdateProcessInstanceDto,
  ): Promise<UpdateResult> {
    const processInstance = await this.processInstanceRepository.findOneBy({
      processInstanceId: id,
    });

    if (!processInstance) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProcessInstanceEntity.name,
        ),
      );
    }

    return await this.processInstanceRepository.update(
      id,
      updateProcessInstanceDto,
    );
  }

  /**
   * Deletes a process instance record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the process instance to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.processInstanceRepository.delete({
      processInstanceId: id,
    });
  }
}
