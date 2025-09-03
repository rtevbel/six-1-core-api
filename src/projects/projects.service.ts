import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectEntity } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
  ) {}

  /**
   * Creates a new project record.
   * @param userId - ID of the user creating the record.
   * @param createProjectDto - Data Transfer Object containing project details.
   * @returns The created ProjectEntity.
   */
  async create(
    userId: number,
    createProjectDto: CreateProjectDto,
  ): Promise<ProjectEntity> {
    createProjectDto.createdBy = userId;

    return await this.projectRepository.save(
      this.projectRepository.create(createProjectDto),
    );
  }

  /**
   * Retrieves all projects with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of projects and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [projects, total] =
      await this.projectRepository.findAndCount(findQuery);

    if (projects.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProjectEntity.name,
        ),
      );
    }

    return {
      projectRecords: projects,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single project by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the project to retrieve.
   * @returns The ProjectEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<ProjectEntity> {

    const project = await this.projectRepository.findOneByOrFail({
      projectId: id,
    });
    
    if (!project) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', ProjectEntity.name),
      );
    }

    return project;
  }

  /**
   * Updates an existing project record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the project to update.
   * @param updateProjectDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateProjectDto: UpdateProjectDto,
  ): Promise<UpdateResult> {
    const project = await this.projectRepository.findOneByOrFail({
      projectId: id,
    });

    if (!project) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', ProjectEntity.name),
      );
    }

    updateProjectDto.updatedBy = userId;

    return await this.projectRepository.update(id, updateProjectDto);
  }

  /**
   * Deletes a project record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the project to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.projectRepository.delete({ projectId: id });
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

    query.where = {tenantId:filtersDto.tenantId};
    
    if (filtersDto.search) {
      query.where = [
        { name: Like(`%${filtersDto.search}%`) },
        { description: Like(`%${filtersDto.search}%`) },
        { projectIdentifier: Like(`%${filtersDto.search}%`) },
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