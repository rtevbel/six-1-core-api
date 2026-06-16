import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { PlatformEventRecordEntity } from './entities/platform_event_record.entity';
import type { PlatformEventRecordFiltersDto } from './dto/platform-event-audit-filters.dto';
import type { PlatformEventRecordFindAllResult } from './interfaces/event-timeline.interface';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class PlatformEventRecordsService {
  constructor(
    @InjectRepository(PlatformEventRecordEntity)
    private readonly recordRepository: Repository<PlatformEventRecordEntity>,
  ) {}

  async findAll(
    filters: PlatformEventRecordFiltersDto,
  ): Promise<PlatformEventRecordFindAllResult> {
    this.assertHasScope(filters);

    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 200);
    const sortOrder = filters.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const qb = this.recordRepository
      .createQueryBuilder('record')
      .orderBy('record.occurredAt', sortOrder)
      .addOrderBy('record.recordId', sortOrder);

    this.applyRecordFilters(qb, filters);

    const [records, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (records.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          PlatformEventRecordEntity.name,
        ),
      );
    }

    return {
      items: records.map((record) => ({
        recordId: record.recordId,
        eventName: record.eventName,
        tenantId: record.tenantId,
        correlationId: record.correlationId,
        causationId: record.causationId,
        entityType: record.entityType,
        entityId: record.entityId,
        status: record.status,
        payload: record.payload,
        occurredAt: record.occurredAt,
        createdAt: record.createdAt,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Loads platform event records for timeline aggregation (no pagination throw).
   */
  async findForTimeline(
    filters: PlatformEventRecordFiltersDto,
    limit: number,
  ): Promise<PlatformEventRecordEntity[]> {
    const qb = this.recordRepository
      .createQueryBuilder('record')
      .orderBy('record.occurredAt', 'ASC')
      .addOrderBy('record.recordId', 'ASC')
      .take(limit);

    this.applyRecordFilters(qb, filters);
    return qb.getMany();
  }

  private applyRecordFilters(
    qb: ReturnType<Repository<PlatformEventRecordEntity>['createQueryBuilder']>,
    filters: PlatformEventRecordFiltersDto,
  ): void {
    if (filters.correlationId?.trim()) {
      qb.andWhere('record.correlationId = :correlationId', {
        correlationId: filters.correlationId.trim(),
      });
    }
    if (filters.tenantId != null) {
      qb.andWhere('record.tenantId = :tenantId', {
        tenantId: filters.tenantId,
      });
    }
    if (filters.entityType?.trim()) {
      qb.andWhere('record.entityType = :entityType', {
        entityType: filters.entityType.trim(),
      });
    }
    if (filters.entityId != null) {
      qb.andWhere('record.entityId = :entityId', {
        entityId: filters.entityId,
      });
    }
    if (filters.eventName?.trim()) {
      qb.andWhere('record.eventName = :eventName', {
        eventName: filters.eventName.trim(),
      });
    }
    if (filters.occurredAfter) {
      qb.andWhere('record.occurredAt >= :occurredAfter', {
        occurredAfter: filters.occurredAfter,
      });
    }
    if (filters.occurredBefore) {
      qb.andWhere('record.occurredAt <= :occurredBefore', {
        occurredBefore: filters.occurredBefore,
      });
    }
  }

  private assertHasScope(filters: PlatformEventRecordFiltersDto): void {
    const hasCorrelation = Boolean(filters.correlationId?.trim());
    const hasEntity =
      filters.tenantId != null &&
      Boolean(filters.entityType?.trim()) &&
      filters.entityId != null;
    const hasTime =
      filters.occurredAfter != null || filters.occurredBefore != null;

    if (!hasCorrelation && !hasEntity && !hasTime) {
      throw new RpcException(
        'Provide correlationId, tenantId+entityType+entityId, or a time range',
      );
    }
  }
}
