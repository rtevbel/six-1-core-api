import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteResult,
  Repository,
  UpdateResult,
} from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { RpcException } from '@nestjs/microservices';
import { ProcessStartRuleEntity } from './entities/process_start_rule.entity';
import { CreateProcessStartRuleDto } from './dto/create-process_start_rule.dto';
import { UpdateProcessStartRuleDto } from './dto/update-process_start_rule.dto';
import { FiltersDto } from './dto/filters.dto';
import { FindAllResultInterface } from './interfaces/findall-result.interface';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../common/runtime-v2-list-pagination';
import {
  getEffectiveTenantId,
  resolveProcessTemplateStoredTenantId,
} from '../common/utils/tenant-scope.util';
import {
  NO_RECORD_FOUND_MESSAGE,
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
} from '../common/constants';
import { ProcessTemplateEntity } from '../process_templates/entities/process_template.entity';
import { assertProcessStartRuleAllowed } from './process-start-rule.validation';

@Injectable()
export class ProcessStartRulesService {
  constructor(
    @InjectRepository(ProcessStartRuleEntity)
    private readonly ruleRepository: Repository<ProcessStartRuleEntity>,
    @InjectRepository(ProcessTemplateEntity)
    private readonly templateRepository: Repository<ProcessTemplateEntity>,
  ) {}

  async create(
    userId: number,
    dto: CreateProcessStartRuleDto,
  ): Promise<ProcessStartRuleEntity> {
    await assertProcessStartRuleAllowed(this.templateRepository, dto);

    return this.ruleRepository.save(
      this.ruleRepository.create({
        tenantId: resolveProcessTemplateStoredTenantId(dto.tenantId),
        eventName: dto.eventName.trim(),
        filterJson: dto.filterJson ?? null,
        templateId: dto.templateId,
        subjectType: dto.subjectType,
        subjectIdSource: dto.subjectIdSource.trim(),
        contextPatch: dto.contextPatch ?? null,
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
    const effectiveTenantId = getEffectiveTenantId(filtersDto.tenantId);
    const where: Record<string, unknown> = {
      eventName: filtersDto.eventName.trim(),
    };
    if (effectiveTenantId !== null) {
      where.tenantId = effectiveTenantId;
    }

    const limit = Math.min(Math.max(filtersDto.limit ?? 10, 1), 10);
    const page = Math.max(filtersDto.page ?? 1, 1);

    const [rules, total] = await this.ruleRepository.findAndCount({
      where,
      relations: ['template'],
      order: { priority: 'ASC', ruleId: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    if (rules.length === 0) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          ProcessStartRuleEntity.name,
        ),
      );
    }

    const pagination = this.buildPagination(page, limit, total);
    return {
      items: rules,
      processStartRuleRecords: rules,
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
  ): Promise<ProcessStartRuleEntity> {
    const effectiveTenantId = getEffectiveTenantId(tenantId);
    const where =
      effectiveTenantId === null
        ? { ruleId }
        : { ruleId, tenantId: effectiveTenantId };

    const rule = await this.ruleRepository.findOne({
      where,
      relations: ['template'],
    });

    if (!rule) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ProcessStartRuleEntity.name,
        ),
      );
    }

    return rule;
  }

  async update(
    userId: number,
    ruleId: number,
    dto: UpdateProcessStartRuleDto,
  ): Promise<UpdateResult> {
    const existing = await this.findOne(userId, ruleId, dto.tenantId);
    await assertProcessStartRuleAllowed(this.templateRepository, {
      ...existing,
      ...dto,
      templateId: dto.templateId ?? existing.templateId,
      subjectType: dto.subjectType ?? existing.subjectType,
      subjectIdSource: dto.subjectIdSource ?? existing.subjectIdSource,
      eventName: dto.eventName ?? existing.eventName,
    });

    const patch: Partial<ProcessStartRuleEntity> = { updatedBy: userId };
    if (dto.tenantId !== undefined) {
      patch.tenantId = resolveProcessTemplateStoredTenantId(dto.tenantId);
    }
    if (dto.eventName !== undefined) {
      patch.eventName = dto.eventName.trim();
    }
    if (dto.filterJson !== undefined) {
      patch.filterJson = dto.filterJson;
    }
    if (dto.templateId !== undefined) {
      patch.templateId = dto.templateId;
    }
    if (dto.subjectType !== undefined) {
      patch.subjectType = dto.subjectType;
    }
    if (dto.subjectIdSource !== undefined) {
      patch.subjectIdSource = dto.subjectIdSource.trim();
    }
    if (dto.contextPatch !== undefined) {
      patch.contextPatch = dto.contextPatch;
    }
    if (dto.priority !== undefined) {
      patch.priority = dto.priority;
    }
    if (dto.isActive !== undefined) {
      patch.isActive = dto.isActive;
    }

    return this.ruleRepository.update(
      existing.ruleId,
      patch as QueryDeepPartialEntity<ProcessStartRuleEntity>,
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
    tenantId: number,
  ): Promise<ProcessStartRuleEntity[]> {
    const normalizedEvent = eventName.trim();
    if (tenantId > 0) {
      const tenantRules = await this.loadActiveRules(normalizedEvent, tenantId);
      if (tenantRules.length > 0) {
        return tenantRules;
      }
    }
    return this.loadActiveRules(normalizedEvent, 0);
  }

  private async loadActiveRules(
    eventName: string,
    tenantId: number,
  ): Promise<ProcessStartRuleEntity[]> {
    return this.ruleRepository.find({
      where: { eventName, tenantId, isActive: true },
      order: { priority: 'ASC', ruleId: 'ASC' },
    });
  }

  private buildPagination(
    page: number,
    limit: number,
    total: number,
  ): RuntimeV2ListPagination {
    return buildRuntimeV2ListPagination(page, limit, total, 10);
  }
}
