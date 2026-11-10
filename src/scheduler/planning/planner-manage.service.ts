import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, Like, Repository } from 'typeorm';
import { TenantUsersService } from '../../tenants/tenant_users/tenant_users.service';
import { SchedulingRequirementsService } from '../requirements/scheduling-requirements.service';
import {
  assertRequirementOpen,
  assertScenarioEditable,
} from '../scenarios/scenario-audit.service';
import {
  assertExpectedRevision,
  toIso,
} from '../scenarios/scenario-lifecycle.mapper';
import { ScheduleScenarioEntity } from '../entities/schedule_scenario.entity';
import { ScheduleScenarioManageRecordEntity } from '../entities/schedule_scenario_manage_record.entity';
import { ManageRecordCategory } from '../constants';
import {
  PlannerManageCatalogDto,
  PlannerManageListDto,
  PlannerManageRemoveDto,
  PlannerManageResolveDto,
  PlannerManageSchemaDto,
  PlannerManageUpsertDto,
} from '../dto/planner-manage.dto';
import {
  PlannerManageCatalogView,
  PlannerManageListView,
  PlannerManageRecordView,
  PlannerManageRemoveView,
  PlannerManageResolveView,
  PlannerManageSchemaView,
  PlannerManageUpsertView,
} from '../interfaces/planner-manage.interface';
import { ScenarioOverlayManageRecord } from '../interfaces/schedule-scenario-lifecycle.interface';
import { NO_RECORD_FOUND_MESSAGE } from '../../common/constants';
import {
  buildManageCategoryCatalogEntry,
  listManageCategoryCatalog,
} from './planner-manage-catalog';

const PARTNER_STATUSES = new Set(['ready', 'committed', 'at_risk']);
const EQUIPMENT_STATUSES = new Set([
  'available',
  'reserved',
  'maintenance',
]);

/**
 * Option A Manage planning — scenario-scoped draft master CRUD.
 */
@Injectable()
export class PlannerManageService {
  constructor(
    private readonly tenantUsers: TenantUsersService,
    private readonly requirements: SchedulingRequirementsService,
    private readonly dataSource: DataSource,
    @InjectRepository(ScheduleScenarioEntity)
    private readonly scenarioRepo: Repository<ScheduleScenarioEntity>,
    @InjectRepository(ScheduleScenarioManageRecordEntity)
    private readonly manageRepo: Repository<ScheduleScenarioManageRecordEntity>,
  ) {}

  /**
   * Phase 2 catalog: category → Object Designer / Dynamic Process keys +
   * Runner field schemas. CRUD still uses list/upsert/remove (scenario draft).
   */
  async catalog(
    userId: number,
    dto: PlannerManageCatalogDto,
  ): Promise<PlannerManageCatalogView> {
    await this.tenantUsers.assertTenantAccess(userId, dto.tenantId);
    return {
      bindingMode: 'scenario_draft',
      runnerKind: 'scenario_draft',
      categories: listManageCategoryCatalog(),
      tasksTab: {
        tabLabel: 'Tasks',
        upsertViaManage: false,
        openTaskSheet: true,
      },
    };
  }

  async schema(
    userId: number,
    dto: PlannerManageSchemaDto,
  ): Promise<PlannerManageSchemaView> {
    await this.tenantUsers.assertTenantAccess(userId, dto.tenantId);
    const entry = buildManageCategoryCatalogEntry(dto.category);
    return {
      category: entry.category,
      objectType: entry.objectType,
      processKey: entry.processKey,
      processTemplateName: entry.processTemplateName,
      templateSetKey: entry.templateSetKey,
      bindingMode: 'scenario_draft',
      runnerKind: 'scenario_draft',
      fields: entry.fields,
      writesLiveMaster: false,
    };
  }

  async resolve(
    userId: number,
    dto: PlannerManageResolveDto,
  ): Promise<PlannerManageResolveView> {
    await this.tenantUsers.assertTenantAccess(userId, dto.tenantId);
    const scenario = await this.assertScenarioForRequirement(
      dto.scheduleScenarioId,
      dto.schedulingRequirementId,
      dto.tenantId,
    );
    const row = await this.manageRepo.findOne({
      where: {
        tenantId: dto.tenantId,
        scheduleScenarioId: scenario.scheduleScenarioId,
        recordKey: dto.recordKey,
      },
    });
    if (!row) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ScheduleScenarioManageRecordEntity.name,
        ),
      );
    }
    const item = this.toView(row);
    return {
      tenantId: dto.tenantId,
      schedulingRequirementId: dto.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      revision: scenario.revision,
      runnerKind: 'scenario_draft',
      resolveInstanceWith: 'recordKey',
      item,
      values: {
        name: item.name,
        parentRecordKey: item.parentRecordKey,
        linkedMasterId: item.linkedMasterId,
        ...(item.attrs ?? {}),
      },
    };
  }

  async list(
    userId: number,
    dto: PlannerManageListDto,
  ): Promise<PlannerManageListView> {
    await this.tenantUsers.assertTenantAccess(userId, dto.tenantId);
    const scenario = await this.assertScenarioForRequirement(
      dto.scheduleScenarioId,
      dto.schedulingRequirementId,
      dto.tenantId,
    );

    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 50, 100);
    const where: Record<string, unknown> = {
      tenantId: dto.tenantId,
      scheduleScenarioId: scenario.scheduleScenarioId,
    };
    if (dto.category) where.category = dto.category;
    if (dto.recordKey) where.recordKey = dto.recordKey;
    if (dto.q?.trim()) where.name = Like(`%${dto.q.trim()}%`);

    const [rows, total] = await this.manageRepo.findAndCount({
      where,
      order: { name: 'ASC', scheduleScenarioManageRecordId: 'ASC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      tenantId: dto.tenantId,
      schedulingRequirementId: dto.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      revision: scenario.revision,
      items: rows.map((r) => this.toView(r)),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async upsert(
    userId: number,
    dto: PlannerManageUpsertDto,
  ): Promise<PlannerManageUpsertView> {
    await this.tenantUsers.assertTenantAccess(userId, dto.tenantId);
    const requirement = await this.requirements.findOneOrFail(
      dto.schedulingRequirementId,
      dto.tenantId,
    );
    assertRequirementOpen(requirement.status);

    const attrs = this.sanitizeAttrs(dto.category, dto.attrs ?? {});

    return this.dataSource.transaction(async (manager) => {
      const scenarioRepo = manager.getRepository(ScheduleScenarioEntity);
      const manageRepo = manager.getRepository(
        ScheduleScenarioManageRecordEntity,
      );

      const scenario = await scenarioRepo.findOne({
        where: {
          scheduleScenarioId: dto.scheduleScenarioId,
          tenantId: dto.tenantId,
        },
      });
      if (!scenario) {
        throw new RpcException({
          statusCode: 404,
          message: 'Schedule scenario not found',
        });
      }
      if (scenario.schedulingRequirementId !== dto.schedulingRequirementId) {
        throw new RpcException({
          statusCode: 400,
          message: 'Scenario does not belong to requirement',
        });
      }
      assertScenarioEditable(scenario.status);
      assertExpectedRevision(scenario, dto.expectedRevision);

      if (dto.parentRecordKey) {
        await this.assertParentExists(
          manageRepo,
          scenario.scheduleScenarioId,
          dto.tenantId,
          dto.parentRecordKey,
          dto.category,
        );
      }

      let row: ScheduleScenarioManageRecordEntity | null = null;
      if (dto.recordKey) {
        row = await manageRepo.findOne({
          where: {
            scheduleScenarioId: scenario.scheduleScenarioId,
            tenantId: dto.tenantId,
            recordKey: dto.recordKey,
          },
        });
      }

      if (row) {
        if (row.category !== dto.category) {
          throw new RpcException({
            statusCode: 400,
            message: 'Manage record category cannot change',
          });
        }
        row.name = dto.name.trim();
        row.parentRecordKey = dto.parentRecordKey ?? null;
        row.linkedMasterId =
          dto.linkedMasterId === undefined
            ? row.linkedMasterId
            : dto.linkedMasterId;
        row.attrs = attrs;
        row.updatedBy = userId;
      } else {
        // Create: omit recordKey (server UUID) OR client-supplied key for
        // Add-session upserts (process embed generates a stable UUID first).
        row = manageRepo.create({
          tenantId: dto.tenantId,
          scheduleScenarioId: scenario.scheduleScenarioId,
          category: dto.category,
          recordKey: dto.recordKey?.trim() || randomUUID(),
          name: dto.name.trim(),
          parentRecordKey: dto.parentRecordKey ?? null,
          linkedMasterId: dto.linkedMasterId ?? null,
          attrs,
          createdBy: userId,
          updatedBy: userId,
        });
      }

      const saved = await manageRepo.save(row);
      scenario.revision += 1;
      await scenarioRepo.save(scenario);

      return {
        tenantId: dto.tenantId,
        scheduleScenarioId: scenario.scheduleScenarioId,
        revision: scenario.revision,
        item: this.toView(saved),
      };
    });
  }

  async remove(
    userId: number,
    dto: PlannerManageRemoveDto,
  ): Promise<PlannerManageRemoveView> {
    await this.tenantUsers.assertTenantAccess(userId, dto.tenantId);
    const requirement = await this.requirements.findOneOrFail(
      dto.schedulingRequirementId,
      dto.tenantId,
    );
    assertRequirementOpen(requirement.status);

    return this.dataSource.transaction(async (manager) => {
      const scenarioRepo = manager.getRepository(ScheduleScenarioEntity);
      const manageRepo = manager.getRepository(
        ScheduleScenarioManageRecordEntity,
      );

      const scenario = await scenarioRepo.findOne({
        where: {
          scheduleScenarioId: dto.scheduleScenarioId,
          tenantId: dto.tenantId,
        },
      });
      if (!scenario) {
        throw new RpcException({
          statusCode: 404,
          message: 'Schedule scenario not found',
        });
      }
      if (scenario.schedulingRequirementId !== dto.schedulingRequirementId) {
        throw new RpcException({
          statusCode: 400,
          message: 'Scenario does not belong to requirement',
        });
      }
      assertScenarioEditable(scenario.status);
      assertExpectedRevision(scenario, dto.expectedRevision);

      const row = await manageRepo.findOne({
        where: {
          scheduleScenarioId: scenario.scheduleScenarioId,
          tenantId: dto.tenantId,
          recordKey: dto.recordKey,
        },
      });
      if (!row) {
        throw new RpcException({
          statusCode: 404,
          message: 'Manage record not found',
        });
      }

      await this.assertRemovable(manageRepo, row);

      await manageRepo.remove(row);
      scenario.revision += 1;
      await scenarioRepo.save(scenario);

      return {
        tenantId: dto.tenantId,
        scheduleScenarioId: scenario.scheduleScenarioId,
        revision: scenario.revision,
        recordKey: dto.recordKey,
        removed: true as const,
      };
    });
  }

  /** Used by scenario Save / Restore / Fork. */
  async listForOverlay(
    scheduleScenarioId: number,
    tenantId: number,
  ): Promise<ScenarioOverlayManageRecord[]> {
    const rows = await this.manageRepo.find({
      where: { scheduleScenarioId, tenantId },
      order: { name: 'ASC', scheduleScenarioManageRecordId: 'ASC' },
    });
    return rows.map((r) => ({
      recordKey: r.recordKey,
      category: r.category,
      name: r.name,
      parentRecordKey: r.parentRecordKey,
      linkedMasterId: r.linkedMasterId,
      attrs: r.attrs ?? {},
    }));
  }

  async replaceFromOverlay(
    scheduleScenarioId: number,
    tenantId: number,
    records: ScenarioOverlayManageRecord[],
    actorUserId?: number | null,
    manager?: EntityManager,
  ): Promise<void> {
    const run = async (em: EntityManager): Promise<void> => {
      const manageRepo = em.getRepository(ScheduleScenarioManageRecordEntity);
      const existing = await manageRepo.find({
        where: { scheduleScenarioId, tenantId },
      });
      if (existing.length) {
        await manageRepo.remove(existing);
      }
      for (const rec of records ?? []) {
        if (!rec?.recordKey || !rec.category || !rec.name) continue;
        await manageRepo.save(
          manageRepo.create({
            tenantId,
            scheduleScenarioId,
            category: rec.category,
            recordKey: rec.recordKey,
            name: rec.name,
            parentRecordKey: rec.parentRecordKey ?? null,
            linkedMasterId: rec.linkedMasterId ?? null,
            attrs: this.sanitizeAttrs(rec.category, rec.attrs ?? {}),
            createdBy: actorUserId ?? null,
            updatedBy: actorUserId ?? null,
          }),
        );
      }
    };
    if (manager) {
      await run(manager);
      return;
    }
    await this.dataSource.transaction(run);
  }

  async copyBetweenScenarios(
    sourceScenarioId: number,
    targetScenarioId: number,
    tenantId: number,
    actorUserId?: number | null,
  ): Promise<void> {
    const source = await this.manageRepo.find({
      where: { scheduleScenarioId: sourceScenarioId, tenantId },
    });
    if (!source.length) return;
    await this.manageRepo.save(
      source.map((r) =>
        this.manageRepo.create({
          tenantId,
          scheduleScenarioId: targetScenarioId,
          category: r.category,
          recordKey: r.recordKey,
          name: r.name,
          parentRecordKey: r.parentRecordKey,
          linkedMasterId: r.linkedMasterId,
          attrs: r.attrs ?? {},
          createdBy: actorUserId ?? r.createdBy,
          updatedBy: actorUserId ?? r.updatedBy,
        }),
      ),
    );
  }

  private async assertScenarioForRequirement(
    scheduleScenarioId: number,
    schedulingRequirementId: number,
    tenantId: number,
  ): Promise<ScheduleScenarioEntity> {
    const scenario = await this.scenarioRepo.findOne({
      where: { scheduleScenarioId, tenantId },
    });
    if (!scenario) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ScheduleScenarioEntity.name,
        ),
      );
    }
    if (scenario.schedulingRequirementId !== schedulingRequirementId) {
      throw new RpcException({
        statusCode: 400,
        message: 'Scenario does not belong to requirement',
      });
    }
    await this.requirements.findOneOrFail(schedulingRequirementId, tenantId);
    return scenario;
  }

  private async assertParentExists(
    manageRepo: Repository<ScheduleScenarioManageRecordEntity>,
    scheduleScenarioId: number,
    tenantId: number,
    parentRecordKey: string,
    category: ManageRecordCategory,
  ): Promise<void> {
    if (category !== 'project') {
      throw new RpcException({
        statusCode: 400,
        message: 'parentRecordKey is only valid for projects',
      });
    }
    const parent = await manageRepo.findOne({
      where: {
        scheduleScenarioId,
        tenantId,
        recordKey: parentRecordKey,
        category: 'project',
      },
    });
    if (!parent) {
      throw new RpcException({
        statusCode: 400,
        message: 'Parent project Manage record not found',
      });
    }
  }

  private async assertRemovable(
    manageRepo: Repository<ScheduleScenarioManageRecordEntity>,
    row: ScheduleScenarioManageRecordEntity,
  ): Promise<void> {
    if (row.category === 'project') {
      const child = await manageRepo.findOne({
        where: {
          scheduleScenarioId: row.scheduleScenarioId,
          tenantId: row.tenantId,
          parentRecordKey: row.recordKey,
        },
      });
      if (child) {
        this.throwReferential(
          'Cannot delete project while subprojects still reference it',
        );
      }
      const linked = await manageRepo
        .createQueryBuilder('m')
        .where('m.schedule_scenario_id = :sid', {
          sid: row.scheduleScenarioId,
        })
        .andWhere('m.tenant_id = :tid', { tid: row.tenantId })
        .andWhere('m.category IN (:...cats)', {
          cats: ['equipment', 'material'],
        })
        .andWhere(
          "JSON_UNQUOTE(JSON_EXTRACT(m.attrs, '$.projectRecordKey')) = :key",
          { key: row.recordKey },
        )
        .getOne();
      if (linked) {
        this.throwReferential(
          'Cannot delete project while equipment or materials still link to it',
        );
      }
    }

    if (row.category === 'person') {
      const team = await manageRepo
        .createQueryBuilder('m')
        .where('m.schedule_scenario_id = :sid', {
          sid: row.scheduleScenarioId,
        })
        .andWhere('m.tenant_id = :tid', { tid: row.tenantId })
        .andWhere('m.category = :cat', { cat: 'team' })
        .andWhere(
          "JSON_CONTAINS(JSON_EXTRACT(m.attrs, '$.memberRecordKeys'), :key)",
          { key: JSON.stringify(row.recordKey) },
        )
        .getOne();
      if (team) {
        this.throwReferential(
          'Cannot delete person while a team still lists them as a member',
        );
      }
    }
  }

  private throwReferential(message: string): never {
    throw new RpcException({
      statusCode: 409,
      message,
      errorCode: 'referential_conflict',
    });
  }

  private sanitizeAttrs(
    category: ManageRecordCategory,
    raw: Record<string, unknown>,
  ): Record<string, unknown> {
    const src = raw && typeof raw === 'object' ? raw : {};
    switch (category) {
      case 'project':
        return {
          code: this.asString(src.code, 64),
          customer: this.asString(src.customer, 255),
          location: this.asString(src.location, 255),
          buildingArea: this.asString(src.buildingArea, 255),
          notes: this.asString(src.notes, 2000),
        };
      case 'person':
        return {
          hoursPerDay: this.asNumber(src.hoursPerDay, 0, 24),
          skills: this.asStringArray(src.skills, 32, 64),
          region: this.asString(src.region, 64),
          email: this.asString(src.email, 255),
          phone: this.asString(src.phone, 64),
          absent: Boolean(src.absent),
          tenantUserId:
            src.tenantUserId == null
              ? null
              : this.asInt(src.tenantUserId),
          notes: this.asString(src.notes, 2000),
        };
      case 'team':
        return {
          memberRecordKeys: this.asUuidArray(src.memberRecordKeys, 64),
          hoursPerDay: this.asNumber(src.hoursPerDay, 0, 24),
          region: this.asString(src.region, 64),
          notes: this.asString(src.notes, 2000),
        };
      case 'partner': {
        const status = this.asString(src.status, 32)?.toLowerCase() ?? 'ready';
        return {
          discipline: this.asString(src.discipline, 128),
          crews: this.asNumber(src.crews, 0, 10000) ?? 0,
          status: PARTNER_STATUSES.has(status) ? status : 'ready',
          contactEmail: this.asString(src.contactEmail, 255),
          notes: this.asString(src.notes, 2000),
        };
      }
      case 'equipment': {
        const status =
          this.asString(src.status, 32)?.toLowerCase() ?? 'available';
        return {
          status: EQUIPMENT_STATUSES.has(status) ? status : 'available',
          skills: this.asStringArray(src.skills, 32, 64),
          projectRecordKey: this.asUuidOrNull(src.projectRecordKey),
          notes: this.asString(src.notes, 2000),
        };
      }
      case 'material':
        return {
          stock: this.asNumber(src.stock, 0, 1_000_000_000) ?? 0,
          reserved: this.asNumber(src.reserved, 0, 1_000_000_000) ?? 0,
          unit: this.asString(src.unit, 32),
          etaUtc: this.asIsoOrNull(src.etaUtc),
          projectRecordKey: this.asUuidOrNull(src.projectRecordKey),
          notes: this.asString(src.notes, 2000),
        };
      default:
        return {};
    }
  }

  private toView(
    row: ScheduleScenarioManageRecordEntity,
  ): PlannerManageRecordView {
    return {
      scheduleScenarioManageRecordId: Number(
        row.scheduleScenarioManageRecordId,
      ),
      recordKey: row.recordKey,
      category: row.category,
      name: row.name,
      parentRecordKey: row.parentRecordKey,
      linkedMasterId:
        row.linkedMasterId == null ? null : Number(row.linkedMasterId),
      attrs: row.attrs ?? {},
      createdAt: toIso(row.createdAt) ?? new Date(0).toISOString(),
      updatedAt: toIso(row.updatedAt) ?? new Date(0).toISOString(),
    };
  }

  private asString(value: unknown, max: number): string | null {
    if (value == null) return null;
    const s = String(value).trim();
    if (!s) return null;
    return s.slice(0, max);
  }

  private asNumber(
    value: unknown,
    min: number,
    max: number,
  ): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.min(max, Math.max(min, n));
  }

  private asInt(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) return null;
    return n;
  }

  private asStringArray(
    value: unknown,
    maxItems: number,
    maxLen: number,
  ): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((v) => String(v).trim())
      .filter(Boolean)
      .slice(0, maxItems)
      .map((s) => s.slice(0, maxLen));
  }

  private asUuidArray(value: unknown, maxItems: number): string[] {
    if (!Array.isArray(value)) return [];
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return value
      .map((v) => String(v).trim())
      .filter((v) => uuidRe.test(v))
      .slice(0, maxItems);
  }

  private asUuidOrNull(value: unknown): string | null {
    if (value == null || value === '') return null;
    const s = String(value).trim();
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRe.test(s) ? s : null;
  }

  private asIsoOrNull(value: unknown): string | null {
    if (value == null || value === '') return null;
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }
}
