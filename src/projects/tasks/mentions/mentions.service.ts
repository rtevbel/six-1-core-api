import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskMentionsEntity } from './entities/mention.entity';
import { CreateTaskMentionDto } from './dto/create-mention.dto';
import { UpdateTaskMentionDto } from './dto/update-mention.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { FiltersDto } from './dto/filters.dto';
import { RpcException } from '@nestjs/microservices';
import {  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../../common/runtime-v2-list-pagination';

@Injectable()
export class TaskMentionsService {
  constructor(
    @InjectRepository(TaskMentionsEntity)
    private readonly mentionRepository: Repository<TaskMentionsEntity>,
  ) {}

  /**
   * Creates a new task mention record.
   * @param userId - ID of the user creating the mention.
   * @param createMentionDto - Data Transfer Object containing mention details.
   * @returns The created TaskMentionsEntity.
   */
  async create(
    userId: number,
    createMentionDto: CreateTaskMentionDto,
  ): Promise<TaskMentionsEntity> {
    return await this.mentionRepository.save(
      this.mentionRepository.create(createMentionDto),
    );
  }

  /**
   * Retrieves all mentions with optional filters, pagination, and sorting.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An array of FindAllResultInterface objects.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [mentions, total] =
      await this.mentionRepository.findAndCount(findQuery);

    if (mentions.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TaskMentionsEntity.name,
        ),
      );
    }

    // Return the mentions along with pagination details
    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: mentions,
      taskMentionRecords: mentions,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single mention by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the mention to retrieve.
   * @returns The TaskMentionsEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<TaskMentionsEntity> {
    const mention = await this.mentionRepository.findOneBy({ mentionId: id });

    if (!mention) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TaskMentionsEntity.name,
        ),
      );
    }

    return mention;
  }

  /**
   * Updates an existing mention record.
   * @param userId - ID of the user updating the mention.
   * @param id - ID of the mention to update.
   * @param updateMentionDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateMentionDto: UpdateTaskMentionDto,
  ): Promise<UpdateResult> {
    const mention = await this.mentionRepository.findOneBy({ mentionId: id });

    if (!mention) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TaskMentionsEntity.name,
        ),
      );
    }

    return await this.mentionRepository.update(id, updateMentionDto);
  }

  /**
   * Deletes a mention record by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the mention to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.mentionRepository.delete({ mentionId: id });
  }

  /**
   * Builds a TypeORM find query based on provided filters.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns A query object for TypeORM.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    query.relations = ['mentionedUser.user', 'createdByUser.user'];
    // Base where condition to filter by commentId
    if (filtersDto.taskId) {
      query.where = { taskId: filtersDto.taskId };
    } else if (filtersDto.commentId) {
      query.where = { commentId: filtersDto.commentId };
    }

    if (filtersDto.search) {
      query.where = [{ mention: Like(`%${filtersDto.search}%`) }];
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
   * Builds pagination details based on filters and total count.
   * @param filtersDto - Filters for pagination.
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
