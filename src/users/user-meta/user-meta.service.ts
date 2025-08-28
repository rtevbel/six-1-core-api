import { Injectable } from '@nestjs/common';
import { Repository, DeleteResult, UpdateResult, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserMetaEntity } from './entities/user-meta.entity';
import { CreateUserMetaDto } from './dto/create-user-meta.dto';
import { UpdateUserMetaDto } from './dto/update-user-meta.dto';
import { RpcException } from '@nestjs/microservices';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

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
  constructor(
    @InjectRepository(UserMetaEntity)
    private readonly userMetaRepository: Repository<UserMetaEntity>,
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
   * @returns An array of UserMetaEntity objects.
   * @throws RpcException if no records are found.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    // Fetch user meta and count total records
    const [metas, total] =
      await this.userMetaRepository.findAndCount(findQuery);

    if (metas.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replaceAll(
          '{entity_name}',
          UserMetaEntity.name,
        ),
      );
    }
    return {
      userMeta: metas,
      pagination: this.buildPagination(filtersDto, total),
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
      userId: userId,
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
    console.log(updateUserMetaDto, 'updateUserMetaDtoupdateUserMetaDto');
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
      userId: userId,
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
      where: { userId: userId, metaKey: metaKey },
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

  /**
   * Builds the query object for filtering, sorting, and pagination.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns The query object for TypeORM's `findAndCount` method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    query.where = { userId: filtersDto.userId };

    // Apply search filters if provided
    if (filtersDto.search) {
      query.where = [
        { metaKey: Like(`%${filtersDto.search}%`) },
        { metaValue: Like(`%${filtersDto.search}%`) },
      ];
    }

    // Apply sorting if provided
    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    }

    // Apply pagination if limit is provided
    if (filtersDto.limit) {
      filtersDto.page = filtersDto.page || 1;
      filtersDto.limit = Math.min(filtersDto.limit, 10);

      query.take = filtersDto.limit;
      query.skip = (filtersDto.page - 1) * filtersDto.limit;
    }

    return query;
  }

  /**
   * Builds the pagination object for the response.
   * @param filtersDto - Filters containing pagination details.
   * @param total - Total number of records matching the query.
   * @returns The pagination object.
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
