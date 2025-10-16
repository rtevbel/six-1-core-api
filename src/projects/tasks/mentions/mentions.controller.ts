import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TaskMentionsService } from './mentions.service';
import { CreateTaskMentionDto } from './dto/create-mention.dto';
import { UpdateTaskMentionDto } from './dto/update-mention.dto';
import { FiltersDto } from './dto/filters.dto';
import { TaskMentionsEntity } from './entities/mention.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TASK_MENTION_PATTERN,
  MICROSERVICE_FIND_ALL_TASK_MENTION_PATTERN,
  MICROSERVICE_FIND_ONE_TASK_MENTION_PATTERN,
  MICROSERVICE_UPDATE_TASK_MENTION_PATTERN,
  MICROSERVICE_REMOVE_TASK_MENTION_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';

@Controller('mentions')
export class TaskMentionsController {
  constructor(private readonly taskMentionsService: TaskMentionsService) {}

  /**
   * Handles the creation of a new mention.
   * @param userId - ID of the user making the request.
   * @param createMentionDto - Data transfer object containing mention details.
   * @returns The created mention entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TASK_MENTION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createMention(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createMentionDto: CreateTaskMentionDto,
  ): Promise<TaskMentionsEntity> {
    return this.taskMentionsService.create(userId, createMentionDto);
  }

  /**
   * Retrieves all mentions based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying mentions.
   * @returns A list of mentions matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TASK_MENTION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllMentions(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.taskMentionsService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single mention by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the mention to retrieve.
   * @returns The mention entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TASK_MENTION_PATTERN)
  findOneMention(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<TaskMentionsEntity | NotFoundException> {
    return this.taskMentionsService.findOne(userId, id);
  }

  /**
   * Updates an existing mention.
   * @param userId - ID of the user making the request.
   * @param updateMentionDto - Data transfer object containing updated mention details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TASK_MENTION_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateMention(
    @Payload('userId') userId: number,
    @Payload('data') updateMentionDto: UpdateTaskMentionDto,
  ): Promise<UpdateResult> {
    return this.taskMentionsService.update(
      userId,
      updateMentionDto.mentionId,
      updateMentionDto,
    );
  }

  /**
   * Deletes a mention by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the mention to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TASK_MENTION_PATTERN)
  removeMention(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.taskMentionsService.remove(userId, id);
  }
}