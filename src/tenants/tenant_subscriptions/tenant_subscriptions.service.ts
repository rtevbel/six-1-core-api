import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import { CreateTenantSubscriptionDto } from './dto/create-tenant_subscription.dto';
import { UpdateTenantSubscriptionDto } from './dto/update-tenant_subscription.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class TenantSubscriptionService {
  constructor(
    @InjectRepository(TenantSubscriptionEntity)
    private readonly tenantSubscriptionRepository: Repository<TenantSubscriptionEntity>,
  ) {}

  /**
   * Creates a new tenant subscription.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param createTenantSubscriptionDto - Data for creating the subscription.
   * @returns The created subscription entity.
   */
  async create(
    userId: number,
    tenantId: number,
    createTenantSubscriptionDto: CreateTenantSubscriptionDto,
  ): Promise<TenantSubscriptionEntity> {
    createTenantSubscriptionDto.tenantId = tenantId;

    return await this.tenantSubscriptionRepository.save(
      this.tenantSubscriptionRepository.create(createTenantSubscriptionDto),
    );
  }

  /**
   * Finds subscriptions based on filters and pagination.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters and pagination options.
   * @returns Filtered subscriptions and pagination details.
   */
  async findAllByFilter(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [subscriptions, total] =
      await this.tenantSubscriptionRepository.findAndCount(findQuery);

    if (subscriptions.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TenantSubscriptionEntity.name,
        ),
      );
    }

    return {
      tennantSubscriptions: subscriptions,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Finds a single subscription by ID and tenant ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the subscription.
   * @returns The subscription entity.
   */
  async findOne(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<TenantSubscriptionEntity> {
    const subscription = await this.tenantSubscriptionRepository.findOne({
      where: { subscriptionId: id, tenantId },
    });

    if (!subscription) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantSubscriptionEntity.name,
        ),
      );
    }
    return subscription;
  }

  /**
   * Updates a subscription by ID and tenant ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the subscription.
   * @param updateTenantSubscriptionDto - Data for updating the subscription.
   * @returns The result of the update operation.
   */
  async update(
    userId: number,
    tenantId: number,
    id: number,
    updateTenantSubscriptionDto: UpdateTenantSubscriptionDto,
  ): Promise<UpdateResult> {
    const subscription = await this.tenantSubscriptionRepository.findOne({
      where: { subscriptionId: id, tenantId },
    });

    if (!subscription) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantSubscriptionEntity.name,
        ),
      );
    }

    return await this.tenantSubscriptionRepository.update(
      id,
      updateTenantSubscriptionDto,
    );
  }

  /**
   * Removes a subscription by ID and tenant ID.
   * @param userId - ID of the user making the request.
   * @param tenantId - ID of the tenant.
   * @param id - ID of the subscription.
   * @returns The result of the delete operation.
   */
  async remove(
    userId: number,
    tenantId: number,
    id: number,
  ): Promise<DeleteResult> {
    const subscription = await this.tenantSubscriptionRepository.findOne({
      where: { subscriptionId: id, tenantId },
    });

    if (!subscription) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TenantSubscriptionEntity.name,
        ),
      );
    }

    return await this.tenantSubscriptionRepository.delete({
      subscriptionId: id,
      tenantId,
    });
  }

  /**
   * Builds the query for filtering subscriptions.
   * @param filtersDto - Filters and pagination options.
   * @returns The query object for filtering.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

   if (filtersDto.tenantId) {
        query.where = [{ tenantId: filtersDto.tenantId}];
    }
    
    if (filtersDto.search) {
      query.where = [{ plan: Like(`%${filtersDto.search}%`) }];
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
   * Builds pagination details for the filtered results.
   * @param filtersDto - Filters and pagination options.
   * @param total - Total number of records.
   * @returns Pagination details.
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
