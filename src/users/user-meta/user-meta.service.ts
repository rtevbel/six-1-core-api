import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Repository, DeleteResult, UpdateResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserMetaEntity } from './entities/user-meta.entity';
import { CreateUserMetaDto } from './dto/create-user-meta.dto';
import { UpdateUserMetaDto } from './dto/update-user-meta.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';
import { ConfigObjectsService } from '../../config_objects/config_objects.service';
import { canonicalListObjectTypeForEntity } from '../../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../../config_objects/list-query/sor-bound-dynamic-list.executor';

/**
 * UserMetaService
 *
 * This service handles CRUD operations for user metadata.
 * It interacts with the `user_meta` table in the database.
 *
 * @version 0.0.1
 */
@Injectable()
export class UserMetaService {
  private static readonly FALLBACK_FIELDS = new Set([
    'userMetaId',
    'userId',
    'metaKey',
    'metaValue',
    'createdAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    userMetaId: 'um.userMetaId',
    userId: 'um.userId',
    metaKey: 'um.metaKey',
    metaValue: 'um.metaValue',
    createdAt: 'um.createdAt',
  };

  constructor(
    @InjectRepository(UserMetaEntity)
    private readonly userMetaRepository: Repository<UserMetaEntity>,
    @Inject(forwardRef(() => ConfigObjectsService))
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  /**
   * Creates a new user metadata record.
   *
   * @param userId - ID of the user making request.
   * @param createUserMetaDto - DTO containing metadata details.
   * @returns The created UserMetaEntity.
   */
  async create(
    userId: number,
    createUserMetaDto: CreateUserMetaDto,
  ): Promise<UserMetaEntity> {
    const newMeta = this.userMetaRepository.create(createUserMetaDto);
    return this.userMetaRepository.save(newMeta);
  }

  /**
   * Retrieves all user metadata records for a specific user.
   *
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for searching, sorting, and pagination.
   * @returns An object containing the filtered records and pagination details.
   * @throws RpcException if no records are found.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    if (typeof filtersDto.limit === 'number' && filtersDto.limit > 0) {
      filtersDto.limit = Math.min(filtersDto.limit, 10);
    }
    if (!filtersDto.page || filtersDto.page < 1) {
      filtersDto.page = 1;
    }

    const canonical = canonicalListObjectTypeForEntity(UserMetaEntity);

    const ctx: CatalogBackedDynamicListContext<UserMetaEntity> = {
      repository: this.userMetaRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'um',
      rootEntityClass: UserMetaEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: ['metaKey', 'metaValue'],
      fallbackCoreFields: UserMetaService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: UserMetaService.FALLBACK_EXPR,
      defaultSortCoreField: 'userMetaId',
      tieBreakOrderBySql: 'um.userMetaId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto;
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: (qb, filters) => {
        const row = filters as FiltersDto;
        qb.andWhere('um.userId = :umUserId', { umUserId: row.userId });
      },
      schemaMissingForRelatedFiltersMessage:
        'User meta configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: metas, total } = await executeCatalogBackedDynamicListQuery(
      ctx,
      filtersDto,
    );

    if (!metas.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replaceAll(
          '{entity_name}',
          UserMetaEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: metas,
      userMeta: metas,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single user metadata record by its ID.
   *
   * @param requestingUserId - ID of the user making the request.
   * @param userId - ID of the user associated with the metadata.
   * @param id - ID of the metadata record to retrieve.
   * @returns The UserMetaEntity object.
   * @throws RpcException if the record is not found.
   */
  async findOne(
    requestingUserId: number,
    userId: number,
    id: number,
  ): Promise<UserMetaEntity> {
    const meta = await this.userMetaRepository.findOneBy({
      userMetaId: id,
      userId,
    });
    if (!meta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          UserMetaEntity.name,
        ),
      );
    }
    return meta;
  }

  /**
   * Updates an existing user metadata record.
   *
   * @param userId - ID of the user making the request.
   * @param id - ID of the metadata record to update.
   * @param updateUserMetaDto - DTO containing updated metadata details.
   * @returns The result of the update operation.
   * @throws RpcException if the record is not found.
   */
  async update(
    userId: number,
    id: number,
    updateUserMetaDto: UpdateUserMetaDto,
  ): Promise<UpdateResult> {
    const meta = await this.userMetaRepository.findOneBy({
      userMetaId: id,
      userId: updateUserMetaDto.userId,
    });
    if (!meta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          UserMetaEntity.name,
        ),
      );
    }
    return this.userMetaRepository.update(id, updateUserMetaDto);
  }

  /**
   * Deletes a user metadata record by its ID.
   *
   * @param requestingUserId - ID of the user making the request.
   * @param userId - ID of the user associated with the metadata.
   * @param id - ID of the metadata record to delete.
   * @returns The result of the delete operation.
   */
  async remove(
    requestingUserId: number,
    userId: number,
    id: number,
  ): Promise<DeleteResult> {
    const meta = await this.userMetaRepository.findOneBy({
      userMetaId: id,
      userId,
    });
    if (!meta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          UserMetaEntity.name,
        ),
      );
    }
    return this.userMetaRepository.delete({ userMetaId: id });
  }

  /**
   * Finds the meta value for a specific user and meta key.
   *
   * @param requestingUserId - ID of the user making the request.
   * @param userId - ID of the user associated with the metadata.
   * @param metaKey - The meta key to search for.
   * @returns The meta value as a string.
   * @throws RpcException if no record is found.
   */
  async findMetaValueByUserIdAndMetaKey(
    requestingUserId: number,
    userId: number,
    metaKey: string,
  ): Promise<string> {
    const meta = await this.userMetaRepository.findOne({
      where: { userId, metaKey },
    });
    if (!meta) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          UserMetaEntity.name,
        ),
      );
    }
    return meta.metaValue;
  }

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
