import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantUserOffDaysEntity } from './entities/tenant_user_off_day.entity';
import { CreateTenantUserOffDayDto } from './dto/create-tenant_user_off_day.dto';
import { UpdateTenantUserOffDayDto } from './dto/update-tenant_user_off_day.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../../common/runtime-v2-list-pagination';


import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class TenantUserOffDaysService {
  constructor(
    @InjectRepository(TenantUserOffDaysEntity)
    private readonly tenantUserOffDaysRepository: Repository<TenantUserOffDaysEntity>,
  ) {}

  /**
   * Creates a new TenantUserOffDaysEntity record.
   * @param userId - ID of the user making the request.
   * @param CreateTenantUserOffDayDto - Data transfer object containing the details for the new record.
   * @returns The newly created TenantUserOffDaysEntity.
   */
  async create(
    userId: number,
    CreateTenantUserOffDayDto: CreateTenantUserOffDayDto,
  ): Promise<TenantUserOffDaysEntity> {
    return await this.tenantUserOffDaysRepository.save(
      this.tenantUserOffDaysRepository.create({
        ...CreateTenantUserOffDayDto,
        createdBy: userId,
      }),
    );
  }

  /**
   * Retrieves a single off-day record by its ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the off-day record to retrieve.
   * @returns The TenantUserOffDaysEntity record.
   * @throws RpcException if the record is not found.
   */
  async findOne(userId: number, id: number): Promise<TenantUserOffDaysEntity> {
    const offDay = await this.tenantUserOffDaysRepository.findOne({
      where: { tenantUserOffDayId: id },
    });

    if (!offDay) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserOffDaysEntity.name,
        ),
      );
    }

    return offDay;
  }

  /**
   * Updates an existing off-day record.
   * @param userId - ID of the user making the request.
   * @param id - ID of the off-day record to update.
   * @param UpdateTenantUserOffDayDto - Data transfer object containing the updated details.
   * @returns The result of the update operation.
   * @throws RpcException if the record is not found.
   */
  async update(
    userId: number,
    id: number,
    UpdateTenantUserOffDayDto: UpdateTenantUserOffDayDto,
  ): Promise<UpdateResult> {
    const offDay = await this.tenantUserOffDaysRepository.findOne({
      where: { tenantUserOffDayId: id },
    });

    if (!offDay) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserOffDaysEntity.name,
        ),
      );
    }

    return await this.tenantUserOffDaysRepository.update(
      id,
      UpdateTenantUserOffDayDto,
    );
  }

  /**
   * Deletes an off-day record by its ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the off-day record to delete.
   * @returns The result of the delete operation.
   * @throws RpcException if the record is not found.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    const offDay = await this.tenantUserOffDaysRepository.findOne({
      where: { tenantUserOffDayId: id },
    });

    if (!offDay) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace(
          '{entity_name}',
          TenantUserOffDaysEntity.name,
        ),
      );
    }

    return await this.tenantUserOffDaysRepository.delete(id);
  }

  /**
   * Retrieves off-day records based on filters and pagination.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Data transfer object containing filter and pagination details.
   * @returns An object containing filtered records and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAllByFilter(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [offDays, total] =
      await this.tenantUserOffDaysRepository.findAndCount(findQuery);

    if (offDays.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantUserOffDaysEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: offDays,
      tenantUserOffDaysRecords: offDays,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Builds a query object for filtering and pagination.
   * @param filtersDto - Data transfer object containing filter and pagination details.
   * @returns A query object for TypeORM's findAndCount method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [{ description: Like(`%${filtersDto.search}%`) }];
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
   * Builds pagination details based on filters and total records.
   * @param filtersDto - Data transfer object containing pagination details.
   * @param total - Total number of records matching the filters.
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
