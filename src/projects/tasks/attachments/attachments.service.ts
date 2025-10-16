import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskAttachmentsEntity } from './entities/attachment.entity';
import { CreateTaskAttachmentDto } from './dto/create-attachment.dto';
import { UpdateTaskAttachmentDto } from './dto/update-attachment.dto';
import { FiltersDto } from './dto/filters.dto';
import { RpcException } from '@nestjs/microservices';
import {FindAllResultInterface} from './interfaces/findall-result.interface';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';

@Injectable()
export class TaskAttachmentsService {
  constructor(
    @InjectRepository(TaskAttachmentsEntity)
    private readonly attachmentRepository: Repository<TaskAttachmentsEntity>,
  ) {}

  /**
   * Creates a new attachment record.
   * @param userId - ID of the user creating the attachment.
   * @param createAttachmentDto - Data Transfer Object containing attachment details.
   * @returns The created TaskAttachmentsEntity.
   */
  async create(
    userId: number,
    createAttachmentDto: CreateTaskAttachmentDto,
  ): Promise<TaskAttachmentsEntity> {
    return await this.attachmentRepository.save(
      this.attachmentRepository.create({
        ...createAttachmentDto,
        createdBy: userId,
      }),
    );
  }

  /**
   * Retrieves all attachments with optional filters, pagination, and sorting.
   * @param userId - ID of the user making the request.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An array of attachments and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [attachments, total] = await this.attachmentRepository.findAndCount(
      findQuery,
    );

    if (attachments.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TaskAttachmentsEntity.name,
        ),
      );
    }

    return {
      taskAttachmentRecords: attachments,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single attachment by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the attachment to retrieve.
   * @returns The TaskAttachmentsEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<TaskAttachmentsEntity> {
    const attachment = await this.attachmentRepository.findOneBy({
      attachmentId: id,
    });

    if (!attachment) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', TaskAttachmentsEntity.name),
      );
    }

    return attachment;
  }

  /**
   * Updates an existing attachment record.
   * @param userId - ID of the user updating the attachment.
   * @param id - ID of the attachment to update.
   * @param updateAttachmentDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateAttachmentDto: UpdateTaskAttachmentDto,
  ): Promise<UpdateResult> {
    const attachment = await this.attachmentRepository.findOneBy({
      attachmentId: id,
    });

    if (!attachment) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll('{entity_name}', TaskAttachmentsEntity.name),
      );
    }

    return await this.attachmentRepository.update(id, updateAttachmentDto);
  }

  /**
   * Deletes an attachment record by ID.
   * @param userId - ID of the user making the request.
   * @param id - ID of the attachment to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.attachmentRepository.delete({ attachmentId: id });
  }

  /**
   * Builds a TypeORM find query based on provided filters.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns A query object for TypeORM.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    
    const query: Record<string, any> = {};

    if (filtersDto.taskId) {
      query.where = { taskId: filtersDto.taskId };
    }
    
    if (filtersDto.search) {
      query.where = [
        { fileName: Like(`%${filtersDto.search}%`) },
        { fileType: Like(`%${filtersDto.search}%`) },
      ];
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