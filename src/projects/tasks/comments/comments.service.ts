import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskCommentsEntity } from './entities/comment.entity';
import { CreateTaskCommentDto } from './dto/create-comment.dto';
import { UpdateTaskCommentDto } from './dto/update-comment.dto';
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
export class CommentsService {
  constructor(
    @InjectRepository(TaskCommentsEntity)
    private readonly commentRepository: Repository<TaskCommentsEntity>,
  ) {}

  /**
   * Creates a new comment record.
   * @param userId - ID of the user creating the comment.
   * @param createCommentDto - Data Transfer Object containing comment details.
   * @returns The created CommentEntity.
   */
  async create(
    userId: number,
    createCommentDto: CreateTaskCommentDto,
  ): Promise<TaskCommentsEntity> {
    return await this.commentRepository.save(
      this.commentRepository.create(createCommentDto),
    );
  }

  /**
   * Retrieves all comments with optional filters, pagination, and sorting.
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

    const [comments, total] =
      await this.commentRepository.findAndCount(findQuery);

    if (comments.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TaskCommentsEntity.name,
        ),
      );
    }

    // Return the comments along with pagination details
    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: comments,
      taskCommentRecords: comments,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Retrieves a single comment by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the comment to retrieve.
   * @returns The TaskCommentsEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<TaskCommentsEntity> {
    const comment = await this.commentRepository.findOneBy({ commentId: id });

    if (!comment) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TaskCommentsEntity.name,
        ),
      );
    }

    return comment;
  }

  /**
   * Updates an existing comment record.
   * @param userId - ID of the user updating the comment.
   * @param id - ID of the comment to update.
   * @param updateCommentDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateCommentDto: UpdateTaskCommentDto,
  ): Promise<UpdateResult> {
    const comment = await this.commentRepository.findOneBy({ commentId: id });

    if (!comment) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TaskCommentsEntity.name,
        ),
      );
    }

    return await this.commentRepository.update(id, updateCommentDto);
  }

  /**
   * Deletes a comment record by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the comment to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.commentRepository.delete({ commentId: id });
  }

  /**
   * Builds a TypeORM find query based on provided filters.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns A query object for TypeORM.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    query.relations = ['createdByUser.user', 'updatedByUser.user'];

    // Base where condition to filter by taskId
    query.where = { taskId: filtersDto.taskId };

    if (filtersDto.search) {
      query.where = [{ comment: Like(`%${filtersDto.search}%`) }];
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
