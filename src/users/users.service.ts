import { Injectable } from '@nestjs/common';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import { FindByDTO } from './dto/find-by.dto';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';

import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../common/runtime-v2-list-pagination';
import { ConfigObjectsService } from '../config_objects/config_objects.service';
import { canonicalListObjectTypeForEntity } from '../config_objects/list-query/catalog-list-object-type.util';
import {
  executeCatalogBackedDynamicListQuery,
  type CatalogBackedDynamicListContext,
} from '../config_objects/list-query/sor-bound-dynamic-list.executor';
import { hash_content } from '../common/functions';

@Injectable()
export class UserService {
  private static readonly BCRYPT_HASH_REGEX =
    /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

  private static readonly FALLBACK_FIELDS = new Set([
    'userId',
    'email',
    'username',
    'firstName',
    'lastName',
    'activationKey',
    'createdAt',
    'updatedAt',
  ]);

  private static readonly FALLBACK_EXPR: Record<string, string> = {
    userId: 'u.userId',
    email: 'u.email',
    username: 'u.username',
    firstName: 'u.firstName',
    lastName: 'u.lastName',
    activationKey: 'u.activationKey',
    createdAt: 'u.createdAt',
    updatedAt: 'u.updatedAt',
  };

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    return await this.userRepository.save(
      this.userRepository.create(createUserDto),
    );
  }

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

    const canonical = canonicalListObjectTypeForEntity(UserEntity);

    const ctx: CatalogBackedDynamicListContext<UserEntity> = {
      repository: this.userRepository,
      configObjectsService: this.configObjectsService,
      canonicalObjectType: canonical,
      rootAlias: 'u',
      rootEntityClass: UserEntity,
      denyCatalogCanonicalType: canonical,
      searchCorePropertyNames: [
        'email',
        'username',
        'firstName',
        'lastName',
        'activationKey',
      ],
      fallbackCoreFields: UserService.FALLBACK_FIELDS,
      fallbackCoreColumnExpressions: UserService.FALLBACK_EXPR,
      defaultSortCoreField: 'userId',
      tieBreakOrderBySql: 'u.userId',
      catalogTenantResolver: (f) => {
        const row = f as FiltersDto & { catalogTenantId?: number };
        return typeof row.catalogTenantId === 'number' &&
          row.catalogTenantId > 0
          ? row.catalogTenantId
          : null;
      },
      applyMandatoryScope: () => undefined,
      schemaMissingForRelatedFiltersMessage:
        'User configuration schema is required for related list filters.',
      maxPageSize: 10,
    };

    const { rows: users, total } = await executeCatalogBackedDynamicListQuery(
      ctx,
      filtersDto,
    );

    if (!users.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          UserEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: users,
      users,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
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

  async findOne(userId: number, id: number): Promise<UserEntity> {
    const user = await this.userRepository.findOneByOrFail({
      userId: id,
    });

    if (!user) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', UserEntity.name),
      );
    }

    return user;
  }

  async findOneBy(userId: number, findByDTO: FindByDTO): Promise<UserEntity> {
    const user = await this.userRepository.findOneBy(findByDTO);

    if (!user) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', UserEntity.name),
      );
    }

    return user;
  }

  async update(
    userId: number,
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UpdateResult> {
    const user = await this.userRepository.findOneByOrFail({
      userId: id,
    });

    if (!user) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', UserEntity.name),
      );
    }

    if (
      updateUserDto.password &&
      !UserService.BCRYPT_HASH_REGEX.test(updateUserDto.password)
    ) {
      updateUserDto.password = await hash_content(updateUserDto.password);
    }

    return await this.userRepository.update(id, updateUserDto);
  }

  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.userRepository.delete({ userId: id });
  }
}
