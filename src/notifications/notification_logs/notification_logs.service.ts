import { Injectable } from '@nestjs/common';
import { Repository, Like, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationLogEntity } from './entities/notification_log.entity';
import { CreateNotificationLogDto } from './dto/create-notification_log.dto';
import { UpdateNotificationLogDto } from './dto/update-notification_log.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import { RpcException } from '@nestjs/microservices';

import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class NotificationLogsService {
  constructor(
    @InjectRepository(NotificationLogEntity)
    private readonly notificationLogRepository: Repository<NotificationLogEntity>,
  ) {}

  /**
   * Creates a new notification log record.
   * @param userId - ID of the user creating the record.
   * @param createNotificationLogDto - Data Transfer Object containing log details.
   * @returns The created NotificationLogEntity.
   */
  async create(
    userId: number,
    createNotificationLogDto: CreateNotificationLogDto,
  ): Promise<NotificationLogEntity> {
   
    return await this.notificationLogRepository.save(
      this.notificationLogRepository.create(createNotificationLogDto),
    );
  }

  /**
   * Retrieves all notification logs with optional filters, pagination, and sorting.
   * @param userId - ID of the user requesting the data.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns An object containing the list of logs and pagination details.
   * @throws RpcException if no records match the filters.
   */
  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const findQuery = this.buildFindQuery(filtersDto);

    const [logs, total] =
      await this.notificationLogRepository.findAndCount(findQuery);

    if (logs.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          NotificationLogEntity.name,
        ),
      );
    }

    return {
      notificationLogRecords: logs,
      pagination: this.buildPagination(filtersDto, total),
    };
  }

  /**
   * Retrieves a single notification log by ID.
   * @param userId - ID of the user requesting the data.
   * @param id - ID of the log to retrieve.
   * @returns The NotificationLogEntity matching the ID.
   * @throws RpcException if no record is found.
   */
  async findOne(userId: number, id: number): Promise<NotificationLogEntity> {
    const log = await this.notificationLogRepository.findOneByOrFail({
      logId: id,
    });

    if (!log) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          NotificationLogEntity.name,
        ),
      );
    }

    return log;
  }

  /**
   * Updates an existing notification log record.
   * @param userId - ID of the user updating the record.
   * @param id - ID of the log to update.
   * @param updateNotificationLogDto - Data Transfer Object containing updated details.
   * @returns The result of the update operation.
   * @throws RpcException if no record is found.
   */
  async update(
    userId: number,
    id: number,
    updateNotificationLogDto: UpdateNotificationLogDto,
  ): Promise<UpdateResult> {
    const log = await this.notificationLogRepository.findOneByOrFail({
      logId: id,
    });

    if (!log) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          NotificationLogEntity.name,
        ),
      );
    }

    return await this.notificationLogRepository.update(id, updateNotificationLogDto);
  }

  /**
   * Deletes a notification log record by ID.
   * @param userId - ID of the user deleting the record.
   * @param id - ID of the log to delete.
   * @returns The result of the delete operation.
   */
  async remove(userId: number, id: number): Promise<DeleteResult> {
    return await this.notificationLogRepository.delete({
      logId: id,
    });
  }

  /**
   * Builds a query object for finding logs based on filters.
   * @param filtersDto - Filters for search, sorting, and pagination.
   * @returns A query object compatible with TypeORM's find method.
   */
  private buildFindQuery(
    filtersDto: FiltersDto,
  ): Record<string, any> {
    const query: Record<string, any> = {};

    if (filtersDto.search) {
      query.where = [
        { response: Like(`%${filtersDto.search}%`) },
        { status: Like(`%${filtersDto.search}%`) },
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
   * Builds pagination details for the response.
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