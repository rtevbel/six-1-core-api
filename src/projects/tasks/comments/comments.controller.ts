import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CommentsService } from './comments.service';
import { CreateTaskCommentDto } from './dto/create-comment.dto';
import { UpdateTaskCommentDto } from './dto/update-comment.dto';
import { FiltersDto } from './dto/filters.dto';
import { TaskCommentsEntity } from './entities/comment.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TASK_COMMENT_PATTERN,
  MICROSERVICE_FIND_ALL_TASK_COMMENTS_PATTERN,
  MICROSERVICE_FIND_ONE_TASK_COMMENT_PATTERN,
  MICROSERVICE_UPDATE_TASK_COMMENT_PATTERN,
  MICROSERVICE_REMOVE_TASK_COMMENT_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Handles the creation of a new comment.
   * @param userId - ID of the user making the request.
   * @param createCommentDto - Data transfer object containing comment details.
   * @returns The created comment entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TASK_COMMENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createComment(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createCommentDto: CreateTaskCommentDto,
  ): Promise<TaskCommentsEntity> {
    return this.commentsService.create(userId, createCommentDto);
  }

  /**
   * Retrieves all comments based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying comments.
   * @returns A list of comments matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TASK_COMMENTS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllComments(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.commentsService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single comment by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the comment to retrieve.
   * @returns The comment entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TASK_COMMENT_PATTERN)
  findOneComment(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<TaskCommentsEntity | NotFoundException> {
    return this.commentsService.findOne(userId, id);
  }

  /**
   * Updates an existing comment.
   * @param userId - ID of the user making the request.
   * @param updateCommentDto - Data transfer object containing updated comment details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TASK_COMMENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateComment(
    @Payload('userId') userId: number,
    @Payload('data') updateCommentDto: UpdateTaskCommentDto,
  ): Promise<UpdateResult> {
    return this.commentsService.update(
      userId,
      updateCommentDto.commentId,
      updateCommentDto,
    );
  }

  /**
   * Deletes a comment by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the comment to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TASK_COMMENT_PATTERN)
  removeComment(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.commentsService.remove(userId, id);
  }
}