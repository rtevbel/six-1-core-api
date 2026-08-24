import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository, UpdateResult } from 'typeorm';
import { CustomerEntity } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../common/constants';
import { CustomerMetaEntity } from './entities/customer_meta.entity';
import { ConfigObjectsService } from '../config_objects/config_objects.service';
import {
  executeSorBoundDynamicListQuery,
  type SorBoundDynamicListContext,
} from '../config_objects/list-query/sor-bound-dynamic-list.executor';

@Injectable()
export class CustomersService {
  /** Fallback core fields used when runtime schema is unavailable. */
  private static readonly FALLBACK_CORE_FIELDS = new Set([
    'customerId',
    'email',
    'firstName',
    'lastName',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_CORE_FIELD_TO_COLUMN: Record<
    string,
    string
  > = {
    customerId: 'c.customerId',
    email: 'c.email',
    firstName: 'c.firstName',
    lastName: 'c.lastName',
    createdAt: 'c.createdAt',
    updatedAt: 'c.updatedAt',
  };

  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new customer record.
   * @param userId - ID of the user creating the record.
   * @param createCustomerDto - Data Transfer Object containing customer details.
   * @returns The created CustomerEntity.
   */
  async create(
    userId: number,
    createCustomerDto: CreateCustomerDto,
  ): Promise<CustomerEntity> {
    return await this.customerRepository.save(
      this.customerRepository.create(createCustomerDto),
    );
  }

  /**
   * Retrieves all customers with optional filters, pagination, sorting, and meta join.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, structured filtering, sorting, and pagination.
   * @returns An object containing the list of customers and pagination details.
   * @throws RpcException if no records match the filters.
   *
   * Uses QueryBuilder parameter binding for values and JSON paths to prevent SQL injection.
   *
   * `search` scans core name/email fields and, when the runtime catalog lists meta keys, each allowlisted JSON path on `customer_meta`.
   *
   * Field allowlists follow {@link ConfigObjectsService.getObjectListFieldCatalog}
   * (`v0.1_get_object_list_field_catalog` with `objectType: customer`); gateway should use that for Object Designer / Explorer.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const ctx: SorBoundDynamicListContext<CustomerEntity> = {
      repository: this.customerRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: 'customer',
      rootAlias: 'c',
      rootEntityClass: CustomerEntity,
      denyCatalogCanonicalType: 'customer',
      meta: {
        entity: CustomerMetaEntity,
        alias: 'cm',
        joinConditionSql: 'cm.customerId = c.customerId',
        mapOnePropertyPath: 'meta',
      },
      searchCorePropertyNames: ['email', 'firstName', 'lastName'],
      fallbackCoreFields: CustomersService.FALLBACK_CORE_FIELDS,
      fallbackCoreColumnExpressions:
        CustomersService.FALLBACK_CORE_FIELD_TO_COLUMN,
      defaultSortCoreField: 'customerId',
      tieBreakOrderBySql: 'c.customerId',
      catalogTenantResolver: (f) =>
        typeof f.tenantId === 'number' && f.tenantId > 0 ? f.tenantId : null,
      applyMandatoryScope: (qb, filters) => {
        if (typeof filters.tenantId !== 'number' || filters.tenantId <= 0) {
          return;
        }
        qb.andWhere(
          `EXISTS (
            SELECT 1
              FROM customer_project_members cpm
              INNER JOIN projects p ON p.project_id = cpm.project_id
             WHERE cpm.customer_id = c.customer_id
               AND p.tenant_id = :customerListTenantId
          )`,
          { customerListTenantId: filters.tenantId },
        );
      },
      schemaMissingForRelatedFiltersMessage:
        'Customer configuration schema is required for related list filters.',
    };

    const { rows: customers, total } =
      await executeSorBoundDynamicListQuery(ctx, filtersDto);

    if (!customers.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          CustomerEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);

    return {
      items: customers,
      customers,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single customer by ID with optional meta relation.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the customer to retrieve.
   * @returns The CustomerEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findOne({
      where: { customerId: id },
      relations: { meta: true },
    });

    if (!customer) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerEntity.name,
        ),
      );
    }

    return customer;
  }

  /**
   * Updates an existing customer record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the customer to update.
   * @param updateCustomerDto - Data Transfer Object containing updated fields.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<UpdateResult> {
    const customer = await this.customerRepository.findOne({
      where: { customerId: id },
    });

    if (!customer) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerEntity.name,
        ),
      );
    }

    return await this.customerRepository.update(id, updateCustomerDto);
  }

  /**
   * Deletes a customer record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the customer to delete.
   * @returns The result of the delete operation.
   * @throws RpcException if no record is found.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    const customer = await this.customerRepository.findOne({
      where: { customerId: id },
    });

    if (!customer) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerEntity.name,
        ),
      );
    }

    return await this.customerRepository.delete({ customerId: id });
  }

  /**
   * Builds the pagination object for the response.
   * @param filtersDto - Incoming list filters.
   * @param total - Total record count for the applied query.
   * @returns Pagination payload used by runtime responses.
   */
  private buildPagination(
    filtersDto: FiltersDto,
    total: number,
  ): { total: number; page: number; limit: number; totalPages: number } {
    const limit = filtersDto.limit || 10;
    return {
      total,
      page: filtersDto.page || 1,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
