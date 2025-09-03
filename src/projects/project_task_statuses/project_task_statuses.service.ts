import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectTaskStatusEntity } from './entities/project_task_status.entity';
import { CreateProjectTaskStatusDto } from './dto/create-project_task_status.dto';
import { UpdateProjectTaskStatusDto } from './dto/update-project_task_status.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class ProjectTaskStatusesService {
  constructor(
    @InjectRepository(ProjectTaskStatusEntity)
    private readonly projectTaskStatusRepository: Repository<ProjectTaskStatusEntity>,
  ) {}

  /**
   * Creates a new project task status record.
   * @param userId - ID of the user creating the record.
   * @param createDto - Data Transfer Object containing task status details.
   * @returns The created ProjectTaskStatusEntity.
   */
  async create(
    userId: number,
    createDto: CreateProjectTaskStatusDto,
  ): Promise<ProjectTaskStatusEntity> {
    
    return await this.projectTaskStatusRepository.save(
      this.projectTaskStatusRepository.create(createDto),
    );
  }

  /**
   * Retrieves all project task statuses with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of task statuses and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [statuses, total] =
      await this.projectTaskStatusRepository.findAndCount(findQuery);

    if (statuses.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProjectTaskStatusEntity.name,
        ),
      );
    }

    return {
      projectTaskStatusesRecords:statuses,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single project task status by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the task status to retrieve.
   * @returns The ProjectTaskStatusEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<ProjectTaskStatusEntity> {
    const status = await this.projectTaskStatusRepository.findOneByOrFail({
      projectTaskStatusId: id,
    });

    if (!status) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProjectTaskStatusEntity.name,
        ),
      );
    }

    return status;
  }

  /**
   * Updates an existing project task status record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the task status to update.
   * @param updateDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateProjectTaskStatusDto,
  ): Promise<UpdateResult> {
    const status = await this.projectTaskStatusRepository.findOneByOrFail({
      projectTaskStatusId: id,
    });

    if (!status) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProjectTaskStatusEntity.name,
        ),
      );
    }
    
    updateDto.updatedBy = userId;
    return await this.projectTaskStatusRepository.update(id, updateDto);
  }

  /**
   * Deletes a project task status record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the task status to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.projectTaskStatusRepository.delete({
      projectTaskStatusId: id,
    });
  }

  /**
   * Builds a TypeORM find query based on provided filters.
   *
   * @private
   * @param {FiltersDto} filtersDto
   * @returns {Record<string, any>}
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    // Mandatory filter
    query.where = { projectId: filtersDto.projectId };
    
    // Optional search filter
    if (filtersDto.search) {
      query.where = [
        { name: Like(`%${filtersDto.search}%`) },
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
   *
   * @private
   * @param {FiltersDto} filtersDto
   * @param {number} total
   * @returns {{ total: number; page: number; limit: number }}
   */
  private buildPagination(
    filtersDto: FiltersDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filtersDto.page || 1,
      limit: filtersDto.limit || 10,
    };
  }
}