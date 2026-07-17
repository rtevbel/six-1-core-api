import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskAttachmentsEntity } from './entities/attachment.entity';
import { CreateTaskAttachmentDto } from './dto/create-attachment.dto';
import { UpdateTaskAttachmentDto } from './dto/update-attachment.dto';
import { FiltersDto } from './dto/filters.dto';
import { RpcException } from '@nestjs/microservices';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../../common/constants';
import { MediaService } from '../../../storage/media.service';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../../common/runtime-v2-list-pagination';

@Injectable()
export class TaskAttachmentsService {
  constructor(
    @InjectRepository(TaskAttachmentsEntity)
    private readonly attachmentRepository: Repository<TaskAttachmentsEntity>,
    private readonly mediaService: MediaService,
  ) {}

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

  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [attachments, total] =
      await this.attachmentRepository.findAndCount(findQuery);

    if (attachments.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          TaskAttachmentsEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: attachments,
      taskAttachmentRecords: attachments,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(userId: number, id: number): Promise<TaskAttachmentsEntity> {
    const attachment = await this.attachmentRepository.findOneBy({
      attachmentId: id,
    });

    if (!attachment) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TaskAttachmentsEntity.name,
        ),
      );
    }

    return attachment;
  }

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
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TaskAttachmentsEntity.name,
        ),
      );
    }

    const result = await this.attachmentRepository.update(
      id,
      updateAttachmentDto,
    );

    if (
      typeof updateAttachmentDto.filePath === 'string' &&
      updateAttachmentDto.filePath !== attachment.filePath
    ) {
      await this.mediaService.deleteRemovedPaths(
        [attachment.filePath],
        [updateAttachmentDto.filePath],
      );
    }

    return result;
  }

  async remove(userId: number, id: number): Promise<DeleteResult> {
    const attachment = await this.attachmentRepository.findOneBy({
      attachmentId: id,
    });

    if (!attachment) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          TaskAttachmentsEntity.name,
        ),
      );
    }

    const result = await this.attachmentRepository.delete({
      attachmentId: id,
    });

    if (attachment.filePath) {
      await this.mediaService.deleteRemovedPaths([attachment.filePath], []);
    }

    return result;
  }

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
