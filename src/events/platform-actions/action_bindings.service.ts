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
import { ActionBindingEntity } from './entities/action_binding.entity';
import { CreateActionBindingDto } from './dto/create-action_binding.dto';
import { UpdateActionBindingDto } from './dto/update-action_binding.dto';
import { ActionBindingFiltersDto } from './dto/action_binding-filters.dto';
import type { ActionBindingFindAllResult } from './interfaces/findall-result.interface';
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
import { PlatformActionsService } from './platform_actions.service';

@Injectable()
export class ActionBindingsService {
  constructor(
    @InjectRepository(ActionBindingEntity)
    private readonly bindingRepository: Repository<ActionBindingEntity>,
    private readonly platformActionsService: PlatformActionsService,
  ) {}

  async create(
    userId: number,
    dto: CreateActionBindingDto,
  ): Promise<ActionBindingEntity> {
    await this.platformActionsService.findOne(userId, dto.actionId, dto.tenantId);

    return this.bindingRepository.save(
      this.bindingRepository.create({
        tenantId: resolveProcessTemplateStoredTenantId(dto.tenantId),
        onEventName: dto.onEventName.trim(),
        actionId: dto.actionId,
        filterJson: dto.filterJson ?? null,
        priority: dto.priority ?? 100,
        isActive: dto.isActive ?? true,
        createdBy: dto.createdBy ?? userId,
        updatedBy: dto.updatedBy ?? userId,
      }),
    );
  }

  async findAll(
    userId: number,
    filtersDto: ActionBindingFiltersDto,
  ): Promise<ActionBindingFindAllResult> {
    const query = this.buildFindQuery(filtersDto);
    const [bindings, total] = await this.bindingRepository.findAndCount(query);

    if (bindings.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ActionBindingEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(filtersDto, total);
    return {
      items: bindings,
      actionBindingRecords: bindings,
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      pagination,
    };
  }

  async findOne(
    userId: number,
    bindingId: number,
    tenantId?: number,
  ): Promise<ActionBindingEntity> {
    const effectiveTenantId = getEffectiveTenantId(tenantId);
    const where =
      effectiveTenantId === null
        ? { bindingId }
        : { bindingId, tenantId: effectiveTenantId };

    const binding = await this.bindingRepository.findOne({
      where,
      relations: ['action'],
    });

    if (!binding) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ActionBindingEntity.name,
        ),
      );
    }

    return binding;
  }

  async update(
    userId: number,
    bindingId: number,
    dto: UpdateActionBindingDto,
  ): Promise<UpdateResult> {
    const existing = await this.findOne(userId, bindingId, dto.tenantId);

    const patch: Partial<ActionBindingEntity> = {
      updatedBy: userId,
    };

    if (dto.tenantId !== undefined) {
      patch.tenantId = resolveProcessTemplateStoredTenantId(dto.tenantId);
    }
    if (dto.onEventName !== undefined) {
      patch.onEventName = dto.onEventName.trim();
    }
    if (dto.actionId !== undefined) {
      await this.platformActionsService.findOne(
        userId,
        dto.actionId,
        dto.tenantId ?? existing.tenantId,
      );
      patch.actionId = dto.actionId;
    }
    if (dto.filterJson !== undefined) {
      patch.filterJson = dto.filterJson;
    }
    if (dto.priority !== undefined) {
      patch.priority = dto.priority;
    }
    if (dto.isActive !== undefined) {
      patch.isActive = dto.isActive;
    }

    return this.bindingRepository.update(
      existing.bindingId,
      patch as QueryDeepPartialEntity<ActionBindingEntity>,
    );
  }

  async remove(
    userId: number,
    bindingId: number,
    tenantId?: number,
  ): Promise<DeleteResult> {
    const existing = await this.findOne(userId, bindingId, tenantId);
    return this.bindingRepository.delete({ bindingId: existing.bindingId });
  }

  /**
   * Active bindings for an event. Tenant-specific bindings override global (`tenant_id = 0`).
   */
  async findActiveBindingsForEvent(
    eventName: string,
    tenantId?: number | string | null,
  ): Promise<ActionBindingEntity[]> {
    const normalizedEvent = eventName.trim();
    const numericTenant =
      tenantId != null && tenantId !== '' ? Number(tenantId) : 0;
    const scopedTenantId =
      Number.isFinite(numericTenant) && numericTenant > 0 ? numericTenant : 0;

    if (scopedTenantId > 0) {
      const tenantBindings = await this.loadActiveBindings(
        normalizedEvent,
        scopedTenantId,
      );
      if (tenantBindings.length > 0) {
        return tenantBindings;
      }
    }

    return this.loadActiveBindings(normalizedEvent, 0);
  }

  private async loadActiveBindings(
    eventName: string,
    tenantId: number,
  ): Promise<ActionBindingEntity[]> {
    return this.bindingRepository.find({
      where: { onEventName: eventName, tenantId, isActive: true },
      relations: ['action'],
      order: { priority: 'ASC', bindingId: 'ASC' },
    });
  }

  private buildFindQuery(
    filtersDto: ActionBindingFiltersDto,
  ): Record<string, unknown> {
    const effectiveTenantId = getEffectiveTenantId(filtersDto.tenantId);
    const where: Record<string, unknown> = {
      onEventName: filtersDto.onEventName.trim(),
    };

    if (effectiveTenantId !== null) {
      where.tenantId = effectiveTenantId;
    }
    if (filtersDto.isActive !== undefined) {
      where.isActive = filtersDto.isActive;
    }

    const query: Record<string, unknown> = {
      where,
      relations: ['action'],
    };

    if (filtersDto.search) {
      query.where = [
        { ...where, onEventName: Like(`%${filtersDto.search}%`) },
        { ...where, action: { name: Like(`%${filtersDto.search}%`) } },
      ];
    }

    if (filtersDto.sortBy) {
      query.order = {
        [filtersDto.sortBy]: filtersDto.sortOrder || 'ASC',
      };
    } else {
      query.order = { priority: 'ASC', bindingId: 'ASC' };
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
    filtersDto: ActionBindingFiltersDto,
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
