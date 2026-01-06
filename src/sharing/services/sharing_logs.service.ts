import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteResult,
  Repository,
  SelectQueryBuilder,
  UpdateResult,
} from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { SharingLogEntity } from '../entities/sharing_log.entity';
import { CreateSharingLogDto } from '../dto/sharing-logs/create-sharing-log.dto';
import { UpdateSharingLogDto } from '../dto/sharing-logs/update-sharing-log.dto';
import { FiltersSharingLogDto } from '../dto/sharing-logs/filters-sharing-log.dto';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../../common/constants';

export interface FindAllSharingLogsResult {
  sharingLogs: SharingLogEntity[];
  pagination: { total: number; page: number; limit: number };
}

@Injectable()
export class SharingLogsService {
  constructor(
    @InjectRepository(SharingLogEntity)
    private readonly repo: Repository<SharingLogEntity>,
  ) {}

  async create(
    userId: number,
    dto: CreateSharingLogDto,
  ): Promise<SharingLogEntity> {
    const entity = this.repo.create(dto);
    if (dto.createdAt) {
      entity.createdAt = new Date(dto.createdAt);
    }
    return await this.repo.save(entity);
  }

  async findAll(
    userId: number,
    filters: FiltersSharingLogDto,
  ): Promise<FindAllSharingLogsResult> {
    const qb = this.buildQuery(filters);
    const [items, total] = await qb.getManyAndCount();

    if (!items.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          SharingLogEntity.name,
        ),
      );
    }

    return {
      sharingLogs: items,
      pagination: this.buildPagination(filters, total),
    };
  }

  async findOne(userId: number, logId: number): Promise<SharingLogEntity> {
    const record = await this.repo.findOne({
      where: { logId },
      relations: ['performer'],
    });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SharingLogEntity.name,
        ),
      );
    }

    return record;
  }

  async update(
    userId: number,
    logId: number,
    dto: UpdateSharingLogDto,
  ): Promise<UpdateResult> {
    const record = await this.repo.findOne({ where: { logId } });

    if (!record) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SharingLogEntity.name,
        ),
      );
    }

    return await this.repo.update(logId, dto);
  }

  async remove(userId: number, logId: number): Promise<DeleteResult> {
    return await this.repo.delete({ logId });
  }

  private buildQuery(
    filters: FiltersSharingLogDto,
  ): SelectQueryBuilder<SharingLogEntity> {
    const qb = this.repo
      .createQueryBuilder('sharingLog')
      .leftJoinAndSelect('sharingLog.performer', 'performer');

    if (filters.sharingId) {
      qb.andWhere('sharingLog.sharingId = :sharingId', {
        sharingId: filters.sharingId,
      });
    }

    if (filters.sharedEntityType) {
      qb.andWhere('sharingLog.sharedEntityType = :sharedEntityType', {
        sharedEntityType: filters.sharedEntityType,
      });
    }

    if (filters.action) {
      qb.andWhere('sharingLog.action = :action', { action: filters.action });
    }

    if (filters.performedBy) {
      qb.andWhere('sharingLog.performedBy = :performedBy', {
        performedBy: filters.performedBy,
      });
    }

    if (filters.from) {
      qb.andWhere('sharingLog.createdAt >= :from', { from: filters.from });
    }

    if (filters.to) {
      qb.andWhere('sharingLog.createdAt <= :to', { to: filters.to });
    }

    if (filters.sortBy) {
      qb.orderBy(
        `sharingLog.${filters.sortBy}`,
        (filters.sortOrder || 'DESC') as 'ASC' | 'DESC',
      );
    }

    if (filters.limit) {
      const limit = Math.min(filters.limit, 50);
      const page = filters.page || 1;
      qb.take(limit);
      qb.skip((page - 1) * limit);
      filters.limit = limit;
      filters.page = page;
    }

    return qb;
  }

  private buildPagination(
    filters: FiltersSharingLogDto,
    total: number,
  ): { total: number; page: number; limit: number } {
    return {
      total,
      page: filters.page || 1,
      limit: filters.limit || 10,
    };
  }
}
