import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationChannelEntity } from './entities/notification_channel.entity';
import { CreateNotificationChannelDto } from './dto/create-notification_channel.dto';
import { UpdateNotificationChannelDto } from './dto/update-notification_channel.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class NotificationChannelsService {
  constructor(
    @InjectRepository(NotificationChannelEntity)
    private readonly notificationChannelRepository: Repository<NotificationChannelEntity>,
  ) {}

  /**
   * Creates a new notification channel record.
   * @param userId - ID of the user creating the record.
   * @param createNotificationChannelDto - Data Transfer Object containing channel details.
   * @returns The created NotificationChannelEntity.
   */
  async create(
    userId: number,
    createNotificationChannelDto: CreateNotificationChannelDto,
  ): Promise<NotificationChannelEntity> {
    createNotificationChannelDto.createdBy = userId;

    return await this.notificationChannelRepository.save(
      this.notificationChannelRepository.create(createNotificationChannelDto),
    );
  }

  /**
   * Retrieves all notification channels with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of channels and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [channels, total] =
      await this.notificationChannelRepository.findAndCount(findQuery);

    if (channels.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          NotificationChannelEntity.name,
        ),
      );
    }

    return {
      notificationChannelRecords: channels,
      pagination: this.buildPagination(filtersDto, total),
    };
  }
  /**
   * Retrieves a single notification channel by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the channel to retrieve.
   * @returns The NotificationChannelEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(
    userId: number,
    id: number,
  ): Promise<NotificationChannelEntity> {
    const channel = await this.notificationChannelRepository.findOneByOrFail({
      channelId: id,
    });

    if (!channel) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          NotificationChannelEntity.name,
        ),
      );
    }

    return channel;
  }

  /**
   * Retrieves a single notification channel by name.
   * @param name - Name of the channel to retrieve.
   * @returns The NotificationChannelEntity matching the name.
   * @throws RpcException if no record is found.
   */
  async findOneByName(name: string): Promise<NotificationChannelEntity> {
    const channel = await this.notificationChannelRepository.findOne({
      where: { name },
    });

    if (!channel) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          NotificationChannelEntity.name,
        ),
      );
    }

    return channel;
  }

  /**
   * Updates an existing notification channel record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the channel to update.
   * @param updateNotificationChannelDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateNotificationChannelDto: UpdateNotificationChannelDto,
  ): Promise<UpdateResult> {
    const channel = await this.notificationChannelRepository.findOneByOrFail({
      channelId: id,
    });

    if (!channel) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          NotificationChannelEntity.name,
        ),
      );
    }

    updateNotificationChannelDto.updatedBy = userId;

    return await this.notificationChannelRepository.update(
      id,
      updateNotificationChannelDto,
    );
  }

  /**
   * Deletes a notification channel record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the channel to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.notificationChannelRepository.delete({ channelId: id });
  }

  /**
   * Builds a query object for finding notification channels based on filters.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns A query object compatible with TypeORM find methods.
   */
  private buildFindQuery(filtersDto: FiltersDto): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [
        { name: Like(`%${filtersDto.search}%`) },
        { description: Like(`%${filtersDto.search}%`) },
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
   * Builds pagination details based on total records and filters.
   * @param filtersDto - Filters for pagination.
   * @param total - Total number of records found.
   * @returns An object containing total records, current page, and limit.
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
