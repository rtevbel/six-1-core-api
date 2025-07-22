import { Controller, ParseIntPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantSubscriptionService } from './tenant_subscriptions.service';
import { CreateTenantSubscriptionDto } from './dto/create-tenant_subscription.dto';
import { UpdateTenantSubscriptionDto } from './dto/update-tenant_subscription.dto';
import { TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import { UpdateResult, DeleteResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../common/pipes/app-rpc-validation.pipe';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_SUBSCRIPTION_PATTERN,
  MICROSERVICE_FIND_ALL_SUBSCRIPTIONS_PATTERN,
  MICROSERVICE_FIND_ONE_SUBSCRIPTION_PATTERN,
  MICROSERVICE_UPDATE_SUBSCRIPTION_PATTERN,
  MICROSERVICE_REMOVE_SUBSCRIPTION_PATTERN,
  MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN,
} from './constants';

// Controller for handling tenant subscription-related microservice requests
@Controller('tenant-subscription')
export class TenantSubscriptionController {
  constructor(
    private readonly tenantSubscriptionService: TenantSubscriptionService,
  ) {}

  /**
   * Handles the creation of a new tenant subscription.
   * @param requestingUserId - ID of the user making the request
   * @param tenantId - ID of the tenant
   * @param createTenantSubscriptionDto - Data for the new subscription
   * @returns The created tenant subscription entity
   */
  @MessagePattern(MICROSERVICE_CREATE_SUBSCRIPTION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async createSubscription(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') createTenantSubscriptionDto: CreateTenantSubscriptionDto,
  ): Promise<TenantSubscriptionEntity> {
    return this.tenantSubscriptionService.create(
      requestingUserId,
      tenantId,
      createTenantSubscriptionDto,
    );
  }

  /**
   * Retrieves a specific tenant subscription by its ID.
   * @param requestingUserId - ID of the user making the request
   * @param tenantId - ID of the tenant
   * @param id - ID of the subscription to retrieve
   * @returns The tenant subscription entity
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_SUBSCRIPTION_PATTERN)
  async findOneSubscription(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<TenantSubscriptionEntity> {
    return this.tenantSubscriptionService.findOne(
      requestingUserId,
      tenantId,
      id,
    );
  }

  /**
   * Retrieves all tenant subscriptions based on filters.
   * @param requestingUserId - ID of the user making the request
   * @param filtersDto - Filters for querying subscriptions
   * @returns A result object containing filtered subscriptions
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_SUBSCRIPTIONS_PATTERN)
  async findAllByFilters(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    return await this.tenantSubscriptionService.findAllByFilter(
      requestingUserId,
      filtersDto,
    );
  }

  /**
   * Retrieves all subscriptions for a specific tenant.
   * @param requestingUserId - ID of the user making the request
   * @param tenantId - ID of the tenant
   * @returns An array of tenant subscription entities
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_BY_TENANT_ID_PATTERN)
  async findAllByTenantId(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<TenantSubscriptionEntity[]> {
    return this.tenantSubscriptionService.findAllByTenantId(
      requestingUserId,
      tenantId,
    );
  }

  /**
   * Updates an existing tenant subscription.
   * @param requestingUserId - ID of the user making the request
   * @param tenantId - ID of the tenant
   * @param updateTenantSubscriptionDto - Data for updating the subscription
   * @returns The result of the update operation
   */
  @MessagePattern(MICROSERVICE_UPDATE_SUBSCRIPTION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  async updateSubscription(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data') updateTenantSubscriptionDto: UpdateTenantSubscriptionDto,
  ): Promise<UpdateResult> {
    return this.tenantSubscriptionService.update(
      requestingUserId,
      tenantId,
      updateTenantSubscriptionDto.subscriptionId,
      updateTenantSubscriptionDto,
    );
  }

  /**
   * Deletes a tenant subscription by its ID.
   * @param requestingUserId - ID of the user making the request
   * @param tenantId - ID of the tenant
   * @param id - ID of the subscription to delete
   * @returns The result of the delete operation
   */
  @MessagePattern(MICROSERVICE_REMOVE_SUBSCRIPTION_PATTERN)
  async removeSubscription(
    @Payload('requestingUserId', ParseIntPipe) requestingUserId: number,
    @Payload('tenantId', ParseIntPipe) tenantId: number,
    @Payload('data', ParseIntPipe) id: number,
  ): Promise<DeleteResult> {
    return this.tenantSubscriptionService.remove(
      requestingUserId,
      tenantId,
      id,
    );
  }
}
