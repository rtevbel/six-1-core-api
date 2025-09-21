import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantTeamProjectEntity } from './entities/tenant_team_project.entity';
import { CreateTenantTeamProjectDto } from './dto/create-tenant_team_project.dto';
import { UpdateTenantTeamProjectDto } from './dto/update-tenant_team_project.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class TenantTeamProjectService {
  constructor(
    @InjectRepository(TenantTeamProjectEntity)
    private readonly tenantTeamProjectRepository: Repository<TenantTeamProjectEntity>,
  ) {}

  /**
   * Creates a new TenantTeamProject record.
   * @param userId - ID of the user creating the record.
   * @param tenantTeamId - ID of the tenant team.
   * @param createTenantTeamProjectDto - DTO containing the data for the new record.
   * @returns The created TenantTeamProjectEntity.
   */
  async create(
    userId: number,
    tenantTeamId: number,
    createTenantTeamProjectDto: CreateTenantTeamProjectDto,
  ): Promise<TenantTeamProjectEntity> {
    createTenantTeamProjectDto.tenantTeamId = tenantTeamId;
    createTenantTeamProjectDto.createdBy = userId;

    return await this.tenantTeamProjectRepository.save(
      this.tenantTeamProjectRepository.create(createTenantTeamProjectDto),
    );
  }

  /**
   * Finds all TenantTeamProject records based on the provided filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - DTO containing filter criteria.
   * @returns An object containing the filtered records and pagination details.
   */
  async findAllByFilter(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [projectRecords, total] =
      await this.tenantTeamProjectRepository.findAndCount(findQuery);

    if (projectRecords.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantTeamProjectEntity.name,
        ),
      );
    }

    return {
      tenantTeamProjectRecords: projectRecords,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Finds a single TenantTeamProject record by its ID and tenant team ID.
   * @param userId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team.
   * @param id - ID of the TenantTeamProject record.
   * @returns The found TenantTeamProjectEntity.
   */
  async findOne(
    userId: number,
    tenantTeamId: number,
    id: number,
  ): Promise<TenantTeamProjectEntity> {
    const project = await this.tenantTeamProjectRepository.findOne({
      where: { teamProjectId: id, tenantTeamId },
    });

    if (!project) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantTeamProjectEntity.name,
        ),
      );
    }
    return project;
  }

  /**
   * Updates an existing TenantTeamProject record.
   * @param userId - ID of the user making the update.
   * @param tenantTeamId - ID of the tenant team.
   * @param id - ID of the record to update.
   * @param updateTenantTeamProjectDto - DTO containing the updated data.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
    tenantTeamId: number,
    id: number,
    updateTenantTeamProjectDto: UpdateTenantTeamProjectDto,
  ): Promise<UpdateResult> {
    const project = await this.tenantTeamProjectRepository.findOne({
      where: { teamProjectId: id, tenantTeamId },
    });

    if (!project) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantTeamProjectEntity.name,
        ),
      );
    }

    return await this.tenantTeamProjectRepository.update(
      id,
      updateTenantTeamProjectDto,
    );
  }

  /**
   * Deletes a TenantTeamProject record.
   * @param userId - ID of the user making the request.
   * @param tenantTeamId - ID of the tenant team.
   * @param id - ID of the record to delete.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    tenantTeamId: number,
    id: number,
  ): Promise<DeleteResult> {
    const project = await this.tenantTeamProjectRepository.findOne({
      where: { teamProjectId: id, tenantTeamId },
    });

    if (!project) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantTeamProjectEntity.name,
        ),
      );
    }

    return await this.tenantTeamProjectRepository.delete({
      teamProjectId: id,
      tenantTeamId,
    });
  }

  /**
   * Builds a query object for filtering TenantTeamProject records.
   * @param filtersDto - DTO containing filter criteria.
   * @returns The query object.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    query.relations = ['team', 'project'];

    query.where = { tenantTeamId: filtersDto.tenantTeamId };

    if (filtersDto.search) {
      query.where = [
        { team: { name: Like(`%${filtersDto.search}%`) } },
        { project: { name: Like(`%${filtersDto.search}%`) } },
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
   * Builds pagination details for the filtered records.
   * @param filtersDto - DTO containing pagination criteria.
   * @param total - Total number of records matching the filters.
   * @returns An object containing pagination details.
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
