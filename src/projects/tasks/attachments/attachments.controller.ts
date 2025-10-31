import {
  Controller,
  NotFoundException,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TaskAttachmentsService } from './attachments.service';
import { CreateTaskAttachmentDto } from './dto/create-attachment.dto';
import { UpdateTaskAttachmentDto } from './dto/update-attachment.dto';
import { FiltersDto } from './dto/filters.dto';
import { TaskAttachmentsEntity } from './entities/attachment.entity';
import { FindAllResultInterface } from './interfaces/findall-result.interface';

import {
  MICROSERVICE_CREATE_TASK_ATTACHMENT_PATTERN,
  MICROSERVICE_FIND_ALL_TASK_ATTACHMENTS_PATTERN,
  MICROSERVICE_FIND_ONE_TASK_ATTACHMENT_PATTERN,
  MICROSERVICE_UPDATE_TASK_ATTACHMENT_PATTERN,
  MICROSERVICE_REMOVE_TASK_ATTACHMENT_PATTERN,
} from './constants';

import { DeleteResult, UpdateResult } from 'typeorm';
import { AppRpcValidationPipe } from '../../../common/pipes/app-rpc-validation.pipe';

@Controller('attachments')
export class TaskAttachmentsController {
  constructor(
    private readonly taskAttachmentsService: TaskAttachmentsService,
  ) {}

  /**
   * Handles the creation of a new attachment.
   * @param userId - ID of the user making the request.
   * @param createAttachmentDto - Data transfer object containing attachment details.
   * @returns The created attachment entity.
   */
  @MessagePattern(MICROSERVICE_CREATE_TASK_ATTACHMENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  createAttachment(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') createAttachmentDto: CreateTaskAttachmentDto,
  ): Promise<TaskAttachmentsEntity> {
    return this.taskAttachmentsService.create(userId, createAttachmentDto);
  }

  /**
   * Retrieves all attachments based on filters.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for querying attachments.
   * @returns A list of attachments matching the filters.
   */
  @MessagePattern(MICROSERVICE_FIND_ALL_TASK_ATTACHMENTS_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  findAllAttachments(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface | never> {
    return this.taskAttachmentsService.findAll(userId, filtersDto);
  }

  /**
   * Retrieves a single attachment by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the attachment to retrieve.
   * @returns The attachment entity or a NotFoundException.
   */
  @MessagePattern(MICROSERVICE_FIND_ONE_TASK_ATTACHMENT_PATTERN)
  findOneAttachment(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<TaskAttachmentsEntity | NotFoundException> {
    return this.taskAttachmentsService.findOne(userId, id);
  }

  /**
   * Updates an existing attachment.
   * @param userId - ID of the user making the request.
   * @param updateAttachmentDto - Data transfer object containing updated attachment details.
   * @returns The result of the update operation.
   */
  @MessagePattern(MICROSERVICE_UPDATE_TASK_ATTACHMENT_PATTERN)
  @UsePipes(AppRpcValidationPipe)
  updateAttachment(
    @Payload('userId') userId: number,
    @Payload('data') updateAttachmentDto: UpdateTaskAttachmentDto,
  ): Promise<UpdateResult> {
    return this.taskAttachmentsService.update(
      userId,
      updateAttachmentDto.attachmentId,
      updateAttachmentDto,
    );
  }

  /**
   * Deletes an attachment by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the attachment to delete.
   * @returns The result of the delete operation.
   */
  @MessagePattern(MICROSERVICE_REMOVE_TASK_ATTACHMENT_PATTERN)
  removeAttachment(
    @Payload('userId') userId: number,
    @Payload('data') id: number,
  ): Promise<DeleteResult> {
    return this.taskAttachmentsService.remove(userId, id);
  }
}
