import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUserWorkingHoursEntity } from './entities/tenant_user_working_hour.entity';
import { CreateTenantUserWorkingHoursDto } from './dto/create-tenant_user_working_hour.dto';
import { UpdateTenantUserWorkingHoursDto } from './dto/update-tenant_user_working_hour.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../../common/runtime-v2-list-pagination';

@Injectable()
export class TenantUserWorkingHoursService {
  constructor(
    @InjectRepository(TenantUserWorkingHoursEntity)
    private readonly tenantUserWorkingHoursRepository: Repository<TenantUserWorkingHoursEntity>,
  ) {}

  /**
   * Creates a new TenantUserWorkingHours record.
   * @param userId - The ID of the user making the request.
   * @param tenantId - The ID of the tenant.
   * @param createTenantUserWorkingHoursDto - DTO containing the data to create the record.
   * @returns The created TenantUserWorkingHoursEntity.
   */
  async create(
    userId: number,
    tenantId: number,
    createTenantUserWorkingHoursDto: CreateTenantUserWorkingHoursDto,
  ): Promise<TenantUserWorkingHoursEntity> {
    const entity = this.tenantUserWorkingHoursRepository.create(
      createTenantUserWorkingHoursDto,
    );
    return await this.tenantUserWorkingHoursRepository.save(entity);
  }

  /**
   * Finds all working hours based on filters.
   * @param userId - The ID of the user making the request.
   * @param tenantId - The ID of the tenant.
   * @param filtersDto - DTO containing filter options.
   * @returns An object containing filtered records and pagination details.
   */
  async findAllByFilter(
    userId: number,
    tenantId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [workingHours, total] =
      await this.tenantUserWorkingHoursRepository.findAndCount(findQuery);

    if (workingHours.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUserWorkingHoursEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: workingHours,
      tenantUserWorkingHourRecords: workingHours,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Builds the query object for filtering records.
   * @param filtersDto - DTO containing filter options.
   * @returns The query object.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {
      where: { tenantUserId: filtersDto.tenantUserId },
    };

    if (filtersDto.search) {
      query.where = [
        { ...query.where, dayOfWeek: Like(`%${filtersDto.search}%`) },
        { ...query.where, startTime: Like(`%${filtersDto.search}%`) },
        { ...query.where, endTime: Like(`%${filtersDto.search}%`) },
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
   * Finds a specific working hour record by ID.
   * @param userId - The ID of the user making the request.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The ID of the tenant user.
   * @param id - The ID of the working hour record.
   * @returns The TenantUserWorkingHoursEntity.
   */
  async findOne(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
  ): Promise<TenantUserWorkingHoursEntity> {
    const workingHour = await this.tenantUserWorkingHoursRepository.findOne({
      where: { tenantUserWorkingHourId: id, tenantUserId },
    });

    if (!workingHour) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserWorkingHoursEntity.name,
        ),
      );
    }

    return workingHour;
  }

  /**
   * Updates a specific working hour record by ID.
   * @param userId - The ID of the user making the request.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The ID of the tenant user.
   * @param id - The ID of the working hour record.
   * @param updateTenantUserWorkingHoursDto - DTO containing the updated data.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
    updateTenantUserWorkingHoursDto: UpdateTenantUserWorkingHoursDto,
  ): Promise<UpdateResult> {
    const workingHour = await this.tenantUserWorkingHoursRepository.findOne({
      where: { tenantUserWorkingHourId: id, tenantUserId },
    });

    if (!workingHour) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserWorkingHoursEntity.name,
        ),
      );
    }

    return await this.tenantUserWorkingHoursRepository.update(
      { tenantUserWorkingHourId: id, tenantUserId },
      updateTenantUserWorkingHoursDto,
    );
  }

  /**
   * Deletes a specific working hour record by ID.
   * @param userId - The ID of the user making the request.
   * @param tenantId - The ID of the tenant.
   * @param tenantUserId - The ID of the tenant user.
   * @param id - The ID of the working hour record.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    tenantId: number,
    tenantUserId: number,
    id: number,
  ): Promise<DeleteResult> {
    const workingHour = await this.tenantUserWorkingHoursRepository.findOne({
      where: { tenantUserWorkingHourId: id, tenantUserId },
    });

    if (!workingHour) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserWorkingHoursEntity.name,
        ),
      );
    }

    return await this.tenantUserWorkingHoursRepository.delete({
      tenantUserWorkingHourId: id,
      tenantUserId,
    });
  }

  /**
   * Builds pagination details for the response.
   * @param filtersDto - DTO containing filter options.
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
