import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantOffDaysEntity } from './entities/tenant_off_day.entity';
import { CreateTenantOffDaysDto } from './dto/create-tenant_off_day.dto';
import { UpdateTenantOffDaysDto } from './dto/update-tenant_off_day.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class TenantOffDaysService {
  constructor(
    @InjectRepository(TenantOffDaysEntity)
    private readonly tenantOffDaysRepository: Repository<TenantOffDaysEntity>,
  ) {}

  /**
   * Creates a new tenant off day record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param createTenantOffDaysDto - DTO containing the data for the new record.
   * @returns The created TenantOffDaysEntity.
   */
  async create(
    userId: number,
    tenantId: number,
    createTenantOffDaysDto: CreateTenantOffDaysDto,
  ): Promise<TenantOffDaysEntity> {
    // Set the createdBy field for auditing purposes
    createTenantOffDaysDto.createdBy = userId;
    console.log(createTenantOffDaysDto,'createTenantOffDaysDto');
    
    // Save the new record to the database
    return await this.tenantOffDaysRepository.save(
      this.tenantOffDaysRepository.create(createTenantOffDaysDto),
    );
  }

  /**
   * Finds all tenant off day records for a specific tenant ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @returns An object containing the data and total count.
   */
  async findAllByTenantId(
    userId: number,
    tenantId: number,
  ): Promise<TenantOffDaysEntity[]> {
  
    // Fetch records 
    const offDays = await this.tenantOffDaysRepository.findBy({tenantId});
    
    // Throw an exception if no records are found
    if (offDays.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantOffDaysEntity.name,
        ),
      );
    }
    
    return offDays;
  }

  /**
   * Finds tenant off day records based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - DTO containing filter criteria.
   * @returns An object containing filtered records and pagination details.
   */
  async findAllByFilter(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
  
    const findQuery = this.buildFindQuery(filtersDto);

    // Fetch records based on filters
    const [offDaysRecords, total] =
      await this.tenantOffDaysRepository.findAndCount(findQuery);

    // Throw an exception if no records are found
    if (offDaysRecords.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantOffDaysEntity.name,
        ),
      );
    }

    return {
      tenantOffDaysRecords: offDaysRecords,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Finds a specific tenant off day record by ID and tenant ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the tenant off day record.
   * @returns The found TenantOffDaysEntity.
   */
  async findOne(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantOffDaysEntity> {
    // Find the record by ID and tenant ID
    const offDay = await this.tenantOffDaysRepository.findOne({
      where: { tenantOffDayId: id, tenantId },
    });

    // Throw an exception if the record is not found
    if (!offDay) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantOffDaysEntity.name,
        ),
      );
    }
    return offDay;
  }

  /**
   * Updates a tenant off day record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the tenant off day record.
   * @param updateTenantOffDaysDto - DTO containing updated data.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
    tenantId: number,
    id: number,
    updateTenantOffDaysDto: UpdateTenantOffDaysDto,
  ): Promise<UpdateResult> {
    // Find the record by ID and tenant ID
    const offDay = await this.tenantOffDaysRepository.findOne({
      where: { tenantOffDayId: id, tenantId },
    });

    // Throw an exception if the record is not found
    if (!offDay) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantOffDaysEntity.name,
        ),
      );
    }

    // Set the updatedBy field for auditing purposes
    updateTenantOffDaysDto.updatedBy = userId;

    // Perform the update operation
    return await this.tenantOffDaysRepository.update(
      id,
      updateTenantOffDaysDto,
    );
  }

  /**
   * Deletes a tenant off day record.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the tenant off day record.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    // Find the record by ID and tenant ID
    const offDay = await this.tenantOffDaysRepository.findOne({
      where: { tenantOffDayId: id, tenantId },
    });

    // Throw an exception if the record is not found
    if (!offDay) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantOffDaysEntity.name,
        ),
      );
    }

    // Perform the delete operation
    return await this.tenantOffDaysRepository.delete({
      tenantOffDayId: id,
      tenantId,
    });
  }

  /**
   * Builds a query object for filtering records.
   * @param filtersDto - DTO containing filter criteria.
   * @returns The query object.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    // Add tenantId criteria
    if (filtersDto.tenantId) {
      query.where = [
        { tenantId: filtersDto.tenantId},
      ];
    }

    // Add search criteria
    if (filtersDto.search) {
      query.where = [
        { description: Like(`%${filtersDto.search}%`) },
      ];
    }

    // Add sorting criteria
    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    // Add pagination criteria
    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page || 1;
      filtersDto.limit = Math.min(filtersDto.limit, 10);

      query.take = filtersDto.limit;
      query.skip = (filtersDto.page - 1) * filtersDto.limit;
    }

    return query;
  }

  /**
   * Builds pagination details for the response.
   * @param filtersDto - DTO containing pagination criteria.
   * @param total - Total number of records.
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