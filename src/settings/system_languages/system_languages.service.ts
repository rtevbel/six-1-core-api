import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SystemLanguageEntity } from '../system_languages/entities/system-language.entity';
import { CreateSystemLanguageDto } from '../system_languages/dto/create-system-language.dto';
import { UpdateSystemLanguageDto } from '../system_languages/dto/update-system-language.dto';
import { FiltersDto } from '../system_languages/dto/filters.dto';
import { FindAllResultInterface } from '../system_languages/interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class SystemLanguagesService {
  constructor(
    @InjectRepository(SystemLanguageEntity)
    private readonly systemLanguageRepository: Repository<SystemLanguageEntity>,
  ) {}

  /**
   * Creates a new system language record.
   * @param userId - ID of the user creating the record.
   * @param createSystemLanguageDto - Data Transfer Object containing language details.
   * @returns The created SystemLanguageEntity.
   */
  async create(
    userId: number,
    createSystemLanguageDto: CreateSystemLanguageDto,
  ): Promise<SystemLanguageEntity> {
    return await this.systemLanguageRepository.save(
      this.systemLanguageRepository.create(createSystemLanguageDto),
    );
  }

  /**
   * Retrieves all system languages with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of languages and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    // Fetch languages and count total records
    const [languages, total] =
      await this.systemLanguageRepository.findAndCount(findQuery);

    // Throw exception if no records are found
    if (languages.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          SystemLanguageEntity.name,
        ),
      );
    }

    return {
      languages,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Builds the query object for filtering, sorting, and pagination.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns The query object for TypeORM's `findAndCount` method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    // Apply search filters if provided
    if (filtersDto.search) {
      query.where = [
        { name: Like(`%${filtersDto.search}%`) },
        { code: Like(`%${filtersDto.search}%`) },
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

  /**
   * Retrieves a single system language by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the language to retrieve.
   * @returns The SystemLanguageEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<SystemLanguageEntity> {
    const language = await this.systemLanguageRepository.findOneByOrFail({
      language_id: id,
    });

    if (!language) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SystemLanguageEntity.name,
        ),
      );
    }

    return language;
  }

  /**
   * Updates an existing system language record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the language to update.
   * @param updateSystemLanguageDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateSystemLanguageDto: UpdateSystemLanguageDto,
  ): Promise<UpdateResult> {
    const language = await this.systemLanguageRepository.findOneByOrFail({
      language_id: id,
    });

    if (!language) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SystemLanguageEntity.name,
        ),
      );
    }

    return await this.systemLanguageRepository.update(
      id,
      updateSystemLanguageDto,
    );
  }

  /**
   * Deletes a system language record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the language to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.systemLanguageRepository.delete({ language_id: id });
  }
}
