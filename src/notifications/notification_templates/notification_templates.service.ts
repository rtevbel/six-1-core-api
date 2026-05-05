import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationTemplateEntity } from './entities/notification_template.entity';
import { CreateNotificationTemplateDto } from './dto/create-notification_template.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification_template.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';


import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class NotificationTemplatesService {
  constructor(
    @InjectRepository(NotificationTemplateEntity)
    private readonly notificationTemplateRepository: Repository<NotificationTemplateEntity>,
  ) {}

  /**
   * Creates a new notification template record.
   * @param userId - ID of the user creating the record.
   * @param createNotificationTemplateDto - Data Transfer Object containing template details.
   * @returns The created NotificationTemplateEntity.
   */
  async create(
    userId: number,
    createNotificationTemplateDto: CreateNotificationTemplateDto,
  ): Promise<NotificationTemplateEntity> {
    createNotificationTemplateDto.createdBy = userId;

    return await this.notificationTemplateRepository.save(
      this.notificationTemplateRepository.create(createNotificationTemplateDto),
    );
  }

  /**
   * Retrieves all notification templates with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of templates and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [templates, total] =
      await this.notificationTemplateRepository.findAndCount(findQuery);

    if (templates.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          NotificationTemplateEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: templates,
      notificationTemplateRecords: templates,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  /**
   * Builds the query object for finding notification templates based on filters.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns A query object compatible with TypeORM's find method.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [
        { name: Like(`%${filtersDto.search}%`) },
        { subject: Like(`%${filtersDto.search}%`) },
        { message: Like(`%${filtersDto.search}%`) },
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

  /**
   * Retrieves a single notification template by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the template to retrieve.
   * @returns The NotificationTemplateEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<NotificationTemplateEntity> {
    const template = await this.notificationTemplateRepository.findOneByOrFail({
      templateId: id,
    });

    if (!template) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          NotificationTemplateEntity.name,
        ),
      );
    }

    return template;
  }

  /**
   * Retrieves a notification template by name and channel ID.
   * @param name - Template name.
   * @param channelId - Channel ID.
   * @returns The NotificationTemplateEntity or null if not found.
   */
  async findOneByNameAndChannel(
    name: string,
    channelId: number,
  ): Promise<NotificationTemplateEntity | null> {
    return await this.notificationTemplateRepository.findOne({
      where: { name, channelId },
    });
  }

  /**
   * Updates an existing notification template record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the template to update.
   * @param updateNotificationTemplateDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateNotificationTemplateDto: UpdateNotificationTemplateDto,
  ): Promise<UpdateResult> {
    const template = await this.notificationTemplateRepository.findOneByOrFail({
      templateId: id,
    });

    if (!template) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          NotificationTemplateEntity.name,
        ),
      );
    }

    updateNotificationTemplateDto.updatedBy = userId;

    return await this.notificationTemplateRepository.update(
      id,
      updateNotificationTemplateDto,
    );
  }

  /**
   * Deletes a notification template record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the template to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.notificationTemplateRepository.delete({ templateId: id });
  }
}
