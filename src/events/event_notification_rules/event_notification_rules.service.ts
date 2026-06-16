import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Like,
  UpdateResult,
  DeleteResult,
} from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { RpcException } from '@nestjs/microservices';
import { EventNotificationRuleEntity } from './entities/event_notification_rule.entity';
import { CreateEventNotificationRuleDto } from './dto/create-event_notification_rule.dto';
import { UpdateEventNotificationRuleDto } from './dto/update-event_notification_rule.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import {
  getEffectiveTenantId,
  resolveProcessTemplateStoredTenantId,
} from '../../common/utils/tenant-scope.util';
import { parseRecipientSpec } from '../notification-rules/recipient-spec.types';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';

@Injectable()
export class EventNotificationRulesService {
  constructor(
    @InjectRepository(EventNotificationRuleEntity)
    private readonly ruleRepository: Repository<EventNotificationRuleEntity>,
  ) {}

  async create(
    userId: number,
    dto: CreateEventNotificationRuleDto,
  ): Promise<EventNotificationRuleEntity> {
    return this.ruleRepository.save(
      this.ruleRepository.create({
        tenantId: resolveProcessTemplateStoredTenantId(dto.tenantId),
        eventName: dto.eventName.trim(),
        filterJson: dto.filterJson ?? null,
        channelId: dto.channelId,
        templateId: dto.templateId,
        recipientSpec: parseRecipientSpec(dto.recipientSpec),
        priority: dto.priority ?? 100,
        isActive: dto.isActive ?? true,
        createdBy: dto.createdBy ?? userId,
        updatedBy: dto.updatedBy ?? userId,
      }),
    );
  }

  async findAll(
    userId: number,
    filtersDto: FiltersDto,
  ): Promise<FindAllResultInterface> {
    const query = this.buildFindQuery(filtersDto);
    const [rules, total] = await this.ruleRepository.findAndCount(query);

    if (rules.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          EventNotificationRuleEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: rules,
      eventNotificationRuleRecords: rules,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(
    userId: number,
    ruleId: number,
    tenantId?: number,
  ): Promise<EventNotificationRuleEntity> {
    const effectiveTenantId = getEffectiveTenantId(tenantId);
    const where =
      effectiveTenantId === null
        ? { ruleId }
        : { ruleId, tenantId: effectiveTenantId };

    const rule = await this.ruleRepository.findOne({
      where,
      relations: ['channel', 'template'],
    });

    if (!rule) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          EventNotificationRuleEntity.name,
        ),
      );
    }

    return rule;
  }

  async update(
    userId: number,
    ruleId: number,
    dto: UpdateEventNotificationRuleDto,
  ): Promise<UpdateResult> {
    const existing = await this.findOne(userId, ruleId, dto.tenantId);

    const patch: Partial<EventNotificationRuleEntity> = {
      updatedBy: userId,
    };

    if (dto.tenantId !== undefined) {
      patch.tenantId = resolveProcessTemplateStoredTenantId(dto.tenantId);
    }
    if (dto.eventName !== undefined) {
      patch.eventName = dto.eventName.trim();
    }
    if (dto.filterJson !== undefined) {
      patch.filterJson = dto.filterJson;
    }
    if (dto.channelId !== undefined) {
      patch.channelId = dto.channelId;
    }
    if (dto.templateId !== undefined) {
      patch.templateId = dto.templateId;
    }
    if (dto.recipientSpec !== undefined) {
      patch.recipientSpec = parseRecipientSpec(dto.recipientSpec);
    }
    if (dto.priority !== undefined) {
      patch.priority = dto.priority;
    }
    if (dto.isActive !== undefined) {
      patch.isActive = dto.isActive;
    }

    return this.ruleRepository.update(
      existing.ruleId,
      patch as QueryDeepPartialEntity<EventNotificationRuleEntity>,
    );
  }

  async remove(
    userId: number,
    ruleId: number,
    tenantId?: number,
  ): Promise<DeleteResult> {
    const existing = await this.findOne(userId, ruleId, tenantId);
    return this.ruleRepository.delete({ ruleId: existing.ruleId });
  }

  /**
   * Active rules for an event. Tenant-specific rules override global (`tenant_id = 0`).
   */
  async findActiveRulesForEvent(
    eventName: string,
    tenantId?: number | string | null,
  ): Promise<EventNotificationRuleEntity[]> {
    const normalizedEvent = eventName.trim();
    const numericTenant =
      tenantId != null && tenantId !== '' ? Number(tenantId) : 0;
    const scopedTenantId =
      Number.isFinite(numericTenant) && numericTenant > 0 ? numericTenant : 0;

    if (scopedTenantId > 0) {
      const tenantRules = await this.loadActiveRules(
        normalizedEvent,
        scopedTenantId,
      );
      if (tenantRules.length > 0) {
        return tenantRules;
      }
    }

    return this.loadActiveRules(normalizedEvent, 0);
  }

  private async loadActiveRules(
    eventName: string,
    tenantId: number,
  ): Promise<EventNotificationRuleEntity[]> {
    return this.ruleRepository.find({
      where: { eventName, tenantId, isActive: true },
      relations: ['channel', 'template'],
      order: { priority: 'ASC', ruleId: 'ASC' },
    });
  }

  private buildFindQuery(filtersDto: FiltersDto): Record<string, unknown> {
    const effectiveTenantId = getEffectiveTenantId(filtersDto.tenantId);
    const where: Record<string, unknown> = {
      eventName: filtersDto.eventName.trim(),
    };

    if (effectiveTenantId !== null) {
      where.tenantId = effectiveTenantId;
    }

    if (filtersDto.isActive !== undefined) {
      where.isActive = filtersDto.isActive;
    }

    const query: Record<string, unknown> = {
      where,
      relations: ['channel', 'template'],
    };

    if (filtersDto.search) {
      query.where = [
        { ...where, eventName: Like(`%${filtersDto.search}%`) },
        { ...where, channel: { name: Like(`%${filtersDto.search}%`) } },
        { ...where, template: { name: Like(`%${filtersDto.search}%`) } },
      ];
    }

    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    } else {
      query.order = { priority: 'ASC', ruleId: 'ASC' };
    }

    if (filtersDto.limit) {
      const page = filtersDto.page || 1;
      const limit = Math.min(filtersDto.limit, 10);
      query.take = limit;
      query.skip = (page - 1) * limit;
    }

    return query;
  }

  private buildPagination(
    filtersDto: FiltersDto,
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
