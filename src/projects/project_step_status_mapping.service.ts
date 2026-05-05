import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectStepStatusMappingEntity } from './entities/project_step_status_mappings.entity';
import { CreateProjectStepStatusMappingDto } from './dto/create-project-step-status-mapping.dto';
import { UpdateProjectStepStatusMappingDto } from './dto/update-project-step-status-mapping.dto';
import { StatusMappingFiltersDto } from './dto/status-mapping-filters.dto';
import { FindAllStatusMappingResultInterface } from './interfaces/findall-status-mapping-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../common/runtime-v2-list-pagination';


import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

@Injectable()
export class ProjectStepStatusMappingService {
  constructor(
    @InjectRepository(ProjectStepStatusMappingEntity)
    private readonly projectStepStatusMappingRepository: Repository<ProjectStepStatusMappingEntity>,
  ) {}

  /**
   * Creates a new ProjectStepStatusMapping record.
   * @param userId - ID of the user performing the operation.
   * @param createDto - Data Transfer Object containing the details for the new record.
   * @returns The created ProjectStepStatusMappingEntity.
   */
  async create(
    userId: number,
    createDto: CreateProjectStepStatusMappingDto,
  ): Promise<ProjectStepStatusMappingEntity> {
    return await this.projectStepStatusMappingRepository.save(
      this.projectStepStatusMappingRepository.create(createDto),
    );
  }

  /**
   * Retrieves all ProjectStepStatusMapping records based on filters.
   * @param userId - ID of the user performing the operation.
   * @param StatusMappingFiltersDto - Filters for searching and pagination.
   * @returns An object containing the records and pagination details.
   */
  async findAll(
    userId: number,
    filtersDto: StatusMappingFiltersDto,
  ): Promise<FindAllStatusMappingResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [records, total] =
      await this.projectStepStatusMappingRepository.findAndCount(findQuery);

    if (records.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProjectStepStatusMappingEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: records,
      projectStepStatusMappingRecords: records,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single ProjectStepStatusMapping record by ID.
   * @param userId - ID of the user performing the operation.
   * @param id - ID of the record to retrieve.
   * @returns The found ProjectStepStatusMappingEntity.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<ProjectStepStatusMappingEntity> {
    const record =
      await this.projectStepStatusMappingRepository.findOneByOrFail({
        mappingId: id,
      });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProjectStepStatusMappingEntity.name,
        ),
      );
    }

    return record;
  }

  /**
   * Updates an existing ProjectStepStatusMapping record.
   * @param userId - ID of the user performing the operation.
   * @param id - ID of the record to update.
   * @param updateDto - Data Transfer Object containing the updated details.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
    id: number,
    updateDto: UpdateProjectStepStatusMappingDto,
  ): Promise<UpdateResult> {
    const record =
      await this.projectStepStatusMappingRepository.findOneByOrFail({
        mappingId: id,
      });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProjectStepStatusMappingEntity.name,
        ),
      );
    }

    return await this.projectStepStatusMappingRepository.update(id, updateDto);
  }

  /**
   * Deletes a ProjectStepStatusMapping record by ID.
   * @param userId - ID of the user performing the operation.
   * @param id - ID of the record to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.projectStepStatusMappingRepository.delete({
      mappingId: id,
    });
  }

  /**
   * Builds the query object for filtering and pagination.
   * @param StatusMappingFiltersDto - Filters for searching and pagination.
   * @returns The query object for the repository.
   */
  private buildFindQuery(
    filtersDto: StatusMappingFiltersDto,
  ): Record<string, any> {
    const query: Record<string, any> = {};

    query.where = {};
    query.relations = ['taskStatus'];

    if (filtersDto.search) {
      query.where = [
        { name: Like(`%${filtersDto.search}%`) },
        { description: Like(`%${filtersDto.search}%`) },
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
   * @param StatusMappingFiltersDto - Filters for pagination.
   * @param total - Total number of records.
   * @returns An object containing pagination details.
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
