import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUserWorkingHoursEntity } from './entities/tenant_user_working_hour.entity';
import { CreateTenantUserWorkingHoursDto } from './dto/create-tenant_user_working_hour.dto';
import { UpdateTenantUserWorkingHoursDto } from './dto/update-tenant_user_working_hour.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class TenantUserWorkingHoursService {
  constructor(
    @InjectRepository(TenantUserWorkingHoursEntity)
    private readonly tenantUserWorkingHoursRepository: Repository<TenantUserWorkingHoursEntity>,
  ) {}

  /**
   * Creates a new working hours record for a tenant user.
   * @param requestingUserId - ID of the user making the request.
   * @param createTenantUserWorkingHoursDto - DTO containing working hours data.
   * @returns The created working hours entity.
   */
  async create(
    requestingUserId: number,
    createTenantUserWorkingHoursDto: CreateTenantUserWorkingHoursDto,
  ): Promise<TenantUserWorkingHoursEntity> {
    return await this.tenantUserWorkingHoursRepository.save(
      this.tenantUserWorkingHoursRepository.create(
        createTenantUserWorkingHoursDto,
      ),
    );
  }

  /**
   * Retrieves all working hours for a specific tenant user.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @returns Array of working hours entities.
   * @throws RpcException if no records are found.
   */
  async findAllByTenantUserId(
    requestingUserId: number,
    tenantUserId: number,
  ): Promise<TenantUserWorkingHoursEntity[]> {
    const workingHours = await this.tenantUserWorkingHoursRepository.find({
      where: { tenantUserId },
    });

    if (workingHours.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUserWorkingHoursEntity.name,
        ),
      );
    }

    return workingHours;
  }

  /**
   * Retrieves working hours based on filters and pagination.
   * @param requestingUserId - ID of the user making the request.
   * @param filtersDto - DTO containing filter and pagination options.
   * @returns Object containing filtered records and pagination details.
   * @throws RpcException if no records are found.
   */
  async findAllByFilter(
    requestingUserId: number,
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

    return {
      tenantUserWorkingHourRecords: workingHours,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Builds the query object for filtering and pagination.
   * @param filtersDto - DTO containing filter and pagination options.
   * @returns Query object for TypeORM.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [
        { dayOfWeek: Like(`%${filtersDto.search}%`) },
        { startTime: Like(`%${filtersDto.search}%`) },
        { endTime: Like(`%${filtersDto.search}%`) },
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
   * Retrieves a specific working hours record by ID.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the working hours record.
   * @returns The working hours entity.
   * @throws RpcException if the record is not found.
   */
  async findOne(
    requestingUserId: number,
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
   * Updates a specific working hours record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the working hours record.
   * @param updateTenantUserWorkingHoursDto - DTO containing updated data.
   * @returns UpdateResult indicating the outcome of the update operation.
   * @throws RpcException if the record is not found.
   */
  async update(
    requestingUserId: number,
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
      id,
      updateTenantUserWorkingHoursDto,
    );
  }

  /**
   * Deletes a specific working hours record.
   * @param requestingUserId - ID of the user making the request.
   * @param tenantUserId - ID of the tenant user.
   * @param id - ID of the working hours record.
   * @returns DeleteResult indicating the outcome of the delete operation.
   * @throws RpcException if the record is not found.
   */
  async remove(
    requestingUserId: number,
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
   * @param filtersDto - DTO containing pagination options.
   * @param total - Total number of records.
   * @returns Pagination details object.
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
