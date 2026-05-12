import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult, UpdateResult } from 'typeorm';
import { CustomerContactInfoEntity } from './entities/customer_contact_info.entity';
import { CreateCustomerContactInfoDto } from './dto/create-customer_contact_info.dto';
import { UpdateCustomerContactInfoDto } from './dto/update-customer_contact_info.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../../common/constants';

import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import { CustomerContactInfoMetaEntity } from './entities/customer_contact_info_meta.entity';
import {
  executeSorBoundDynamicListQuery,
  type SorBoundDynamicListContext,
} from '../../config_objects/list-query/sor-bound-dynamic-list.executor';

@Injectable()
export class CustomerContactInfoService {
  private static readonly FALLBACK_CORE_FIELDS = new Set([
    'customerContactId',
    'customerId',
    'secondaryEmail',
    'phone',
    'address',
    'city',
    'state',
    'country',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_CORE_FIELD_TO_COLUMN: Record<
    string,
    string
  > = {
    customerContactId: 'cci.customerContactId',
    customerId: 'cci.customerId',
    secondaryEmail: 'cci.secondaryEmail',
    phone: 'cci.phone',
    address: 'cci.address',
    city: 'cci.city',
    state: 'cci.state',
    country: 'cci.country',
    createdAt: 'cci.createdAt',
    updatedAt: 'cci.updatedAt',
  };

  constructor(
    @InjectRepository(CustomerContactInfoEntity)
    private readonly contactInfoRepository: Repository<CustomerContactInfoEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a contact-info row under a customer.
   * @param userId - ID of the authenticated user.
   * @param customerId - Owning customer identifier.
   * @param createDto - Contact-info creation payload.
   * @returns The created contact-info entity.
   */
  async create(
    userId: number,
    customerId: number,
    createDto: CreateCustomerContactInfoDto,
  ): Promise<CustomerContactInfoEntity> {
    createDto.customerId = customerId;
    createDto.createdBy = userId;
    createDto.updatedBy = userId;

    return await this.contactInfoRepository.save(
      this.contactInfoRepository.create(createDto),
    );
  }

  /**
   * Retrieves customer contact-info rows with pagination and filters.
   * @param userId - ID of the authenticated user.
   * @param filtersDto - Query filters and pagination options.
   * @returns Paginated contact-info result payload.
   * @throws RpcException if no records match the filters.
   */
  async findAllByFilters(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    if (typeof filtersDto.limit === 'number' && filtersDto.limit > 0) {
      filtersDto.limit = Math.min(filtersDto.limit, 10);
    }
    if (!filtersDto.page || filtersDto.page < 1) {
      filtersDto.page = 1;
    }

    const ctx: SorBoundDynamicListContext<CustomerContactInfoEntity> = {
      repository: this.contactInfoRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: 'customer_contact',
      rootAlias: 'cci',
      rootEntityClass: CustomerContactInfoEntity,
      denyCatalogCanonicalType: 'customer_contact',
      meta: {
        entity: CustomerContactInfoMetaEntity,
        alias: 'ccim',
        joinConditionSql: 'ccim.customerContactId = cci.customerContactId',
      },
      searchCorePropertyNames: ['secondaryEmail', 'phone', 'address'],
      fallbackCoreFields: CustomerContactInfoService.FALLBACK_CORE_FIELDS,
      fallbackCoreColumnExpressions:
        CustomerContactInfoService.FALLBACK_CORE_FIELD_TO_COLUMN,
      defaultSortCoreField: 'customerContactId',
      tieBreakOrderBySql: 'cci.customerContactId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.tenantId === 'number' && row.tenantId > 0
          ? row.tenantId
          : null;
      },
      applyMandatoryScope: (qb, filters) => {
        const f = filters as FiltersDto;
        qb.andWhere('cci.customerId = :customerId', {
          customerId: f.customerId,
        });
      },
      schemaMissingForRelatedFiltersMessage:
        'Customer contact configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: records, total } = await executeSorBoundDynamicListQuery(
      ctx,
      filtersDto,
    );

    if (!records.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          CustomerContactInfoEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: records,
      contactInfoRecords: records,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves one customer contact-info row by identifier.
   * @param userId - ID of the authenticated user.
   * @param customerId - Owning customer identifier.
   * @param id - Contact-info identifier.
   * @returns The matched contact-info entity.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    customerId: number,
    id: number,
  ): Promise<CustomerContactInfoEntity> {
    const record = await this.contactInfoRepository.findOne({
      where: { customerContactId: id, customerId },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerContactInfoEntity.name,
        ),
      );
    }

    return record;
  }

  /**
   * Updates one customer contact-info row by identifier.
   * @param userId - ID of the authenticated user.
   * @param customerId - Owning customer identifier.
   * @param id - Contact-info identifier.
   * @param updateDto - Contact-info update payload.
   * @returns TypeORM update result.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    customerId: number,
    id: number,
    updateDto: UpdateCustomerContactInfoDto,
  ): Promise<UpdateResult> {
    const record = await this.contactInfoRepository.findOne({
      where: { customerContactId: id, customerId },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerContactInfoEntity.name,
        ),
      );
    }

    updateDto.updatedBy = userId;

    return await this.contactInfoRepository.update(id, updateDto);
  }

  /**
   * Deletes one customer contact-info row by identifier.
   * @param userId - ID of the authenticated user.
   * @param customerId - Owning customer identifier.
   * @param id - Contact-info identifier.
   * @returns TypeORM delete result.
   * @throws RpcException if no record is found.
   */
  async remove(
    userId: number,
    customerId: number,
    id: number,
  ): Promise<DeleteResult> {
    const record = await this.contactInfoRepository.findOne({
      where: { customerContactId: id, customerId },
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          CustomerContactInfoEntity.name,
        ),
      );
    }

    return await this.contactInfoRepository.delete({
      customerContactId: id,
      customerId,
    });
  }

  /**
   * Builds runtime-v2 pagination payload.
   * @param filtersDto - Query filters and pagination options.
   * @param total - Total records count.
   * @returns Runtime pagination payload.
   */
  private buildPagination(
    filtersDto: FiltersDto,
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
