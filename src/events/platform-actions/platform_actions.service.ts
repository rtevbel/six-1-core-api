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
import { PlatformActionEntity } from './entities/platform_action.entity';
import { CreatePlatformActionDto } from './dto/create-platform_action.dto';
import { UpdatePlatformActionDto } from './dto/update-platform_action.dto';
import { PlatformActionFiltersDto } from './dto/platform_action-filters.dto';
import type { PlatformActionFindAllResult } from './interfaces/findall-result.interface';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import {
  getEffectiveTenantId,
  resolveProcessTemplateStoredTenantId,
} from '../../common/utils/tenant-scope.util';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../../common/constants';
import {
  parseEmitEventActionConfig,
  parseSendNotificationActionConfig,
  type PlatformActionConfig,
  type PlatformActionType,
} from './types/platform-action.types';

@Injectable()
export class PlatformActionsService {
  constructor(
    @InjectRepository(PlatformActionEntity)
    private readonly actionRepository: Repository<PlatformActionEntity>,
  ) {}

  async create(
    userId: number,
    dto: CreatePlatformActionDto,
  ): Promise<PlatformActionEntity> {
    const config = this.parseAndValidateConfig(dto.actionType, dto.config);

    return this.actionRepository.save(
      this.actionRepository.create({
        tenantId: resolveProcessTemplateStoredTenantId(dto.tenantId),
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        actionType: dto.actionType,
        config,
        priority: dto.priority ?? 100,
        isActive: dto.isActive ?? true,
        createdBy: dto.createdBy ?? userId,
        updatedBy: dto.updatedBy ?? userId,
      }),
    );
  }

  async findAll(
    userId: number,
    filtersDto: PlatformActionFiltersDto,
  ): Promise<PlatformActionFindAllResult> {
    const query = this.buildFindQuery(filtersDto);
    const [actions, total] = await this.actionRepository.findAndCount(query);

    if (actions.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          PlatformActionEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: actions,
      platformActionRecords: actions,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(
    userId: number,
    actionId: number,
    tenantId?: number,
  ): Promise<PlatformActionEntity> {
    const effectiveTenantId = getEffectiveTenantId(tenantId);
    const where =
      effectiveTenantId === null
        ? { actionId }
        : { actionId, tenantId: effectiveTenantId };

    const action = await this.actionRepository.findOne({ where });

    if (!action) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          PlatformActionEntity.name,
        ),
      );
    }

    return action;
  }

  async update(
    userId: number,
    actionId: number,
    dto: UpdatePlatformActionDto,
  ): Promise<UpdateResult> {
    const existing = await this.findOne(userId, actionId, dto.tenantId);

    const patch: Partial<PlatformActionEntity> = {
      updatedBy: userId,
    };

    if (dto.tenantId !== undefined) {
      patch.tenantId = resolveProcessTemplateStoredTenantId(dto.tenantId);
    }
    if (dto.name !== undefined) {
      patch.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      patch.description = dto.description?.trim() ?? null;
    }
    if (dto.actionType !== undefined) {
      patch.actionType = dto.actionType;
    }
    if (dto.config !== undefined || dto.actionType !== undefined) {
      const actionType = dto.actionType ?? existing.actionType;
      patch.config = this.parseAndValidateConfig(
        actionType,
        dto.config ?? (existing.config as unknown as Record<string, unknown>),
      );
    }
    if (dto.priority !== undefined) {
      patch.priority = dto.priority;
    }
    if (dto.isActive !== undefined) {
      patch.isActive = dto.isActive;
    }

    return this.actionRepository.update(
      existing.actionId,
      patch as QueryDeepPartialEntity<PlatformActionEntity>,
    );
  }

  async remove(
    userId: number,
    actionId: number,
    tenantId?: number,
  ): Promise<DeleteResult> {
    const existing = await this.findOne(userId, actionId, tenantId);
    return this.actionRepository.delete({ actionId: existing.actionId });
  }

  parseAndValidateConfig(
    actionType: PlatformActionType,
    raw: Record<string, unknown>,
  ): PlatformActionConfig {
    if (actionType === 'emit_event') {
      const config = parseEmitEventActionConfig(raw);
      if (!config) {
        throw new RpcException(
          'Invalid emit_event config: eventName is required',
        );
      }
      return config;
    }

    const config = parseSendNotificationActionConfig(raw);
    if (!config) {
      throw new RpcException(
        'Invalid send_notification config: channelId, templateId, and recipientSpec are required',
      );
    }
    return config;
  }

  private buildFindQuery(
    filtersDto: PlatformActionFiltersDto,
  ): Record<string, unknown> {
    const effectiveTenantId = getEffectiveTenantId(filtersDto.tenantId);
    const where: Record<string, unknown> = {};

    if (effectiveTenantId !== null) {
      where.tenantId = effectiveTenantId;
    }
    if (filtersDto.actionType) {
      where.actionType = filtersDto.actionType;
    }
    if (filtersDto.isActive !== undefined) {
      where.isActive = filtersDto.isActive;
    }

    const query: Record<string, unknown> = { where };

    if (filtersDto.search) {
      query.where = [
        { ...where, name: Like(`%${filtersDto.search}%`) },
        { ...where, description: Like(`%${filtersDto.search}%`) },
      ];
    }

    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    } else {
      query.order = { priority: 'ASC', actionId: 'ASC' };
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
    filtersDto: PlatformActionFiltersDto,
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
