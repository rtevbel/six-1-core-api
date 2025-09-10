import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantTeamEntity } from './entities/tenant_team.entity';
import { CreateTenantTeamDto } from './dto/create-tenant_team.dto';
import { UpdateTenantTeamDto } from './dto/update-tenant_team.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { v4 as uuidv4 } from 'uuid';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class TenantTeamService {
  constructor(
    @InjectRepository(TenantTeamEntity)
    private readonly tenantTeamRepository: Repository<TenantTeamEntity>,
  ) {}

  /**
   * Creates a new tenant team record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param createTenantTeamDto - DTO containing team details.
   * @returns The created TenantTeamEntity.
   */
  async create(
    userId: number,
    tenantId: number,
    createTenantTeamDto: CreateTenantTeamDto,
  ): Promise<TenantTeamEntity> {

    createTenantTeamDto.teamIdentifier =  this.generateUniqueTeamIdentifier(createTenantTeamDto.name);
    return await this.tenantTeamRepository.save(
      this.tenantTeamRepository.create(createTenantTeamDto),
    );
  }

  /**
   * Retrieves team records based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for searching and sorting records.
   * @returns An object containing the filtered records and pagination details.
   */
  async findAllByFilter(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [teamRecords, total] =
      await this.tenantTeamRepository.findAndCount(findQuery);

    if (teamRecords.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantTeamEntity.name,
        ),
      );
    }

    return {
      tenantTeamRecords: teamRecords,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a specific team record by ID and tenant ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the team record.
   * @returns The TenantTeamEntity record.
   */
  async findOne(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantTeamEntity> {
    const team = await this.tenantTeamRepository.findOne({
      where: { tenantTeamId: id, tenantId },
    });

    if (!team) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantTeamEntity.name,
        ),
      );
    }
    return team;
  }

  /**
   * Updates a specific team record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the team record.
   * @param updateTenantTeamDto - DTO containing updated team details.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
    tenantId: number,
    id: number,
    updateTenantTeamDto: UpdateTenantTeamDto,
  ): Promise<UpdateResult> {
    const team = await this.tenantTeamRepository.findOne({
      where: { tenantTeamId: id, tenantId },
    });

    if (!team) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantTeamEntity.name,
        ),
      );
    }

    updateTenantTeamDto.updatedBy = userId;

    return await this.tenantTeamRepository.update(id, updateTenantTeamDto);
  }

  /**
   * Deletes a specific team record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the team record.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    const team = await this.tenantTeamRepository.findOne({
      where: { tenantTeamId: id, tenantId },
    });

    if (!team) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantTeamEntity.name,
        ),
      );
    }

    return await this.tenantTeamRepository.delete({
      tenantTeamId: id,
      tenantId,
    });
  }

  /**
   * Builds a query object for filtering and pagination.
   * @param filtersDto - DTO containing filter and pagination options.
   * @returns The query object.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    query.where = {tenantId:filtersDto.tenantId};
    
    if (filtersDto.search) {
      query.where = [
        { name: Like(`%${filtersDto.search}%`) },
        { description: Like(`%${filtersDto.search}%`) },
        { teamIdentifier: Like(`%${filtersDto.search}%`) },
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
   * Builds pagination metadata.
   * @param filtersDto - DTO containing pagination options.
   * @param total - Total number of records.
   * @returns Pagination metadata.
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

   /**
    * Generates a unique team identifier based on the team name.
    * @param {string} name - The name of the team.
    * @return {string} - A unique identifier for the task.
   */
   private generateUniqueTeamIdentifier(name: string): string {

    const normalizedTaskName = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');

      // Generate a short unique identifier (e.g., timestamp in milliseconds)
      const uniqueId = Date.now().toString(36); // Converts timestamp to a base-36 string

      return `teanm-${normalizedTaskName}-${uniqueId}`; // Unique identifier for the task

   }

}
