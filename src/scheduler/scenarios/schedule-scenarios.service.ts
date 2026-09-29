import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { ScheduleScenarioEntity } from '../entities/schedule_scenario.entity';
import { SchedulingRequirementEntity } from '../entities/scheduling_requirement.entity';
import { ScenarioPlannedTaskEntity } from '../entities/scenario_planned_task.entity';
import { ScenarioPlannedShiftEntity } from '../entities/scenario_planned_shift.entity';
import { ScenarioResourceAssignmentEntity } from '../entities/scenario_resource_assignment.entity';
import { ScheduleScenarioVersionEntity } from '../entities/schedule_scenario_version.entity';
import { ScheduledTaskEntity } from '../entities/scheduled_task.entity';
import { ResourceAssignmentEntity } from '../entities/resource_assignment.entity';
import { ResourceAssignmentShiftEntity } from '../entities/resource_assignment_shifts.entity';
import { SchedulingRequirementsService } from '../requirements/scheduling-requirements.service';
import { ScenarioPlanningService } from '../planning/scenario-planning.service';
import {
  ScenarioAuditService,
  assertRequirementOpen,
  assertScenarioEditable,
} from './scenario-audit.service';
import { ScheduleScenarioStatus } from '../constants';
import { NO_RECORD_FOUND_MESSAGE } from '../../common/constants';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';
import { TenantUsersService } from '../../tenants/tenant_users/tenant_users.service';
import {
  ListScheduleScenarioVersionsResult,
  RestoreScheduleScenarioVersionResult,
  SaveScheduleScenarioResult,
  ScheduleScenarioView,
  ScheduleScenarioVersionDetailView,
  ScenarioOverlayJson,
} from '../interfaces/schedule-scenario-lifecycle.interface';
import {
  assertExpectedRevision,
  buildOverlayFromPlannedTasks,
  hashOverlay,
  mapScenarioView,
  mapVersionDetail,
  mapVersionSummary,
  parseOverlayJson,
} from './scenario-lifecycle.mapper';

@Injectable()
export class ScheduleScenariosService {
  private readonly logger = new Logger(ScheduleScenariosService.name);

  constructor(
    @InjectRepository(ScheduleScenarioEntity)
    private readonly scenarioRepo: Repository<ScheduleScenarioEntity>,
    @InjectRepository(SchedulingRequirementEntity)
    private readonly reqRepo: Repository<SchedulingRequirementEntity>,
    @InjectRepository(ScenarioPlannedTaskEntity)
    private readonly plannedTaskRepo: Repository<ScenarioPlannedTaskEntity>,
    @InjectRepository(ScenarioPlannedShiftEntity)
    private readonly shiftRepo: Repository<ScenarioPlannedShiftEntity>,
    @InjectRepository(ScenarioResourceAssignmentEntity)
    private readonly assignmentRepo: Repository<ScenarioResourceAssignmentEntity>,
    @InjectRepository(ScheduleScenarioVersionEntity)
    private readonly versionRepo: Repository<ScheduleScenarioVersionEntity>,
    @InjectRepository(ScheduledTaskEntity)
    private readonly schedRepo: Repository<ScheduledTaskEntity>,
    @InjectRepository(ResourceAssignmentEntity)
    private readonly liveAssignmentRepo: Repository<ResourceAssignmentEntity>,
    @InjectRepository(ResourceAssignmentShiftEntity)
    private readonly liveShiftRepo: Repository<ResourceAssignmentShiftEntity>,
    private readonly requirements: SchedulingRequirementsService,
    private readonly planning: ScenarioPlanningService,
    private readonly audit: ScenarioAuditService,
    private readonly tenantUsers: TenantUsersService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    userId: number,
    input: {
      tenantId: number;
      schedulingRequirementId: number;
      name: string;
      notes?: string | null;
      from?: 'live' | { scenarioId: number };
      activate?: boolean;
    },
  ): Promise<ScheduleScenarioEntity> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);
    const requirement = await this.requirements.findOneOrFail(
      input.schedulingRequirementId,
      input.tenantId,
    );
    assertRequirementOpen(requirement.status);

    const maxRev = await this.scenarioRepo
      .createQueryBuilder('s')
      .select('MAX(s.revision)', 'max')
      .where('s.scheduling_requirement_id = :id', {
        id: requirement.schedulingRequirementId,
      })
      .getRawOne<{ max: string | null }>();
    const revision = Number(maxRev?.max ?? 0) + 1;

    const scenario = await this.scenarioRepo.save(
      this.scenarioRepo.create({
        schedulingRequirementId: requirement.schedulingRequirementId,
        tenantId: input.tenantId,
        name: input.name,
        notes: input.notes ?? null,
        status: 'draft',
        parentScenarioId: null,
        revision,
        basedOnLiveAt: null,
        createdBy: userId,
      }),
    );

    if (input.from === 'live') {
      await this.seedFromLive(scenario, requirement);
      scenario.basedOnLiveAt = new Date();
      await this.scenarioRepo.save(scenario);
    } else if (input.from && typeof input.from === 'object') {
      await this.copyScenarioGraph(input.from.scenarioId, scenario);
      scenario.parentScenarioId = input.from.scenarioId;
      await this.scenarioRepo.save(scenario);
    }

    if (input.activate) {
      await this.setStatus(userId, {
        tenantId: input.tenantId,
        scheduleScenarioId: scenario.scheduleScenarioId,
        status: 'active',
        expectedRevision: scenario.revision,
      });
      return this.findOneOrFail(scenario.scheduleScenarioId, input.tenantId);
    }

    await this.audit.appendEvent({
      schedulingRequirementId: requirement.schedulingRequirementId,
      scheduleScenarioId: scenario.scheduleScenarioId,
      actorUserId: userId,
      kind: 'created',
      payload: { from: input.from ?? 'empty' },
    });

    return scenario;
  }

  async update(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      name?: string;
      notes?: string | null;
    },
  ): Promise<ScheduleScenarioEntity> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);
    const scenario = await this.findOneOrFail(
      input.scheduleScenarioId,
      input.tenantId,
    );
    if (input.name !== undefined) scenario.name = input.name;
    if (input.notes !== undefined) scenario.notes = input.notes;
    const saved = await this.scenarioRepo.save(scenario);
    await this.audit.appendEvent({
      schedulingRequirementId: saved.schedulingRequirementId,
      scheduleScenarioId: saved.scheduleScenarioId,
      actorUserId: userId,
      kind: 'updated',
      payload: { metadata: true },
    });
    return saved;
  }

  async setStatus(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      status: Exclude<ScheduleScenarioStatus, 'definitive'>;
      expectedRevision?: number;
    },
  ): Promise<ScheduleScenarioEntity> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);
    if (input.status === ('definitive' as ScheduleScenarioStatus)) {
      throw new RpcException({
        statusCode: 400,
        message: 'definitive status is only set via mark_definitive',
        errorCode: 'use_mark_definitive',
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const scenarioRepo = manager.getRepository(ScheduleScenarioEntity);
      const reqRepo = manager.getRepository(SchedulingRequirementEntity);

      const scenario = await scenarioRepo.findOne({
        where: {
          scheduleScenarioId: input.scheduleScenarioId,
          tenantId: input.tenantId,
        },
      });
      if (!scenario) {
        throw new RpcException(
          NO_RECORD_FOUND_MESSAGE.replaceAll(
            '{entity_name}',
            ScheduleScenarioEntity.name,
          ),
        );
      }
      assertExpectedRevision(scenario, input.expectedRevision);

      const requirement = await reqRepo.findOne({
        where: {
          schedulingRequirementId: scenario.schedulingRequirementId,
          tenantId: input.tenantId,
        },
      });
      if (!requirement) {
        throw new RpcException('Scheduling requirement not found');
      }
      if (requirement.status !== 'open' && input.status !== 'archived') {
        throw new RpcException(
          `Requirement is ${requirement.status}; only archive is allowed`,
        );
      }

      if (input.status === 'active') {
        await scenarioRepo.update(
          {
            schedulingRequirementId: scenario.schedulingRequirementId,
            status: 'active',
          },
          { status: 'draft' },
        );
        scenario.status = 'active';
        requirement.activeScenarioId = scenario.scheduleScenarioId;
      } else if (input.status === 'draft') {
        if (scenario.status === 'active') {
          requirement.activeScenarioId = null;
        }
        scenario.status = 'draft';
      } else if (input.status === 'archived') {
        if (scenario.status === 'active') {
          requirement.activeScenarioId = null;
        }
        scenario.status = 'archived';
      }

      await scenarioRepo.save(scenario);
      await reqRepo.save(requirement);
      await this.audit.appendEvent({
        schedulingRequirementId: scenario.schedulingRequirementId,
        scheduleScenarioId: scenario.scheduleScenarioId,
        actorUserId: userId,
        kind: 'status_changed',
        payload: { status: scenario.status },
      });
      return scenario;
    });
  }

  async fork(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      name: string;
      activate?: boolean;
    },
  ): Promise<ScheduleScenarioEntity> {
    const source = await this.findOneOrFail(
      input.scheduleScenarioId,
      input.tenantId,
    );
    return this.create(userId, {
      tenantId: input.tenantId,
      schedulingRequirementId: source.schedulingRequirementId,
      name: input.name,
      from: { scenarioId: source.scheduleScenarioId },
      activate: input.activate,
    });
  }

  async compare(
    userId: number,
    input: {
      tenantId: number;
      leftId: number;
      rightId: number;
    },
  ): Promise<Record<string, unknown>> {
    const left = await this.findOneOrFail(input.leftId, input.tenantId);
    const right = await this.findOneOrFail(input.rightId, input.tenantId);
    if (left.schedulingRequirementId !== right.schedulingRequirementId) {
      throw new RpcException('Scenarios must belong to the same requirement');
    }

    const leftGraph = await this.planning.loadScenarioGraph(left.scheduleScenarioId);
    const rightGraph = await this.planning.loadScenarioGraph(
      right.scheduleScenarioId,
    );

    const leftByTask = new Map(
      leftGraph.plannedTasks.map((t) => [t.taskId, t]),
    );
    const rightByTask = new Map(
      rightGraph.plannedTasks.map((t) => [t.taskId, t]),
    );
    const taskIds = new Set([...leftByTask.keys(), ...rightByTask.keys()]);

    const windowDiffs: Array<Record<string, unknown>> = [];
    const assigneeDiffs: Array<Record<string, unknown>> = [];
    let leftHard = 0;
    let rightHard = 0;

    for (const taskId of taskIds) {
      const l = leftByTask.get(taskId);
      const r = rightByTask.get(taskId);
      if (!l || !r) {
        windowDiffs.push({
          taskId,
          change: !l ? 'added_on_right' : 'removed_on_right',
        });
        continue;
      }
      if (
        l.plannedStartUtc.getTime() !== r.plannedStartUtc.getTime() ||
        l.plannedEndUtc.getTime() !== r.plannedEndUtc.getTime()
      ) {
        windowDiffs.push({
          taskId,
          left: {
            start: l.plannedStartUtc,
            end: l.plannedEndUtc,
          },
          right: {
            start: r.plannedStartUtc,
            end: r.plannedEndUtc,
          },
        });
      }
      const lUsers = (l.shifts ?? [])
        .map((s) => s.tenantUserId)
        .filter(Boolean)
        .sort()
        .join(',');
      const rUsers = (r.shifts ?? [])
        .map((s) => s.tenantUserId)
        .filter(Boolean)
        .sort()
        .join(',');
      if (lUsers !== rUsers) {
        assigneeDiffs.push({ taskId, left: lUsers, right: rUsers });
      }
      leftHard += Array.isArray((l.conflictSummary as any)?.hard)
        ? (l.conflictSummary as any).hard.length
        : 0;
      rightHard += Array.isArray((r.conflictSummary as any)?.hard)
        ? (r.conflictSummary as any).hard.length
        : 0;
    }

    const result = {
      leftId: left.scheduleScenarioId,
      rightId: right.scheduleScenarioId,
      windowDiffs,
      assigneeDiffs,
      conflictCounts: { leftHard, rightHard },
    };

    await this.audit.appendEvent({
      schedulingRequirementId: left.schedulingRequirementId,
      actorUserId: userId,
      kind: 'compared',
      payload: {
        leftId: left.scheduleScenarioId,
        rightId: right.scheduleScenarioId,
      },
    });

    return result;
  }

  async findOne(
    userId: number,
    scheduleScenarioId: number,
    tenantId: number,
  ): Promise<ScheduleScenarioView> {
    await this.tenantUsers.assertTenantAccess(userId, tenantId);
    const scenario = await this.findOneOrFail(scheduleScenarioId, tenantId);
    const requirement = await this.reqRepo.findOne({
      where: {
        schedulingRequirementId: scenario.schedulingRequirementId,
        tenantId,
      },
    });
    return mapScenarioView(scenario, {
      definitiveScenarioId: requirement?.definitiveScenarioId ?? null,
    });
  }

  async findAll(
    userId: number,
    filters: {
      tenantId: number;
      schedulingRequirementId: number;
      status?: ScheduleScenarioStatus;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    items: ScheduleScenarioView[];
    pagination: RuntimeV2ListPagination;
  }> {
    await this.tenantUsers.assertTenantAccess(userId, filters.tenantId);
    await this.requirements.findOneOrFail(
      filters.schedulingRequirementId,
      filters.tenantId,
    );
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 50);
    const where: Record<string, unknown> = {
      tenantId: filters.tenantId,
      schedulingRequirementId: filters.schedulingRequirementId,
    };
    if (filters.status) where.status = filters.status;
    const [items, total] = await this.scenarioRepo.findAndCount({
      where,
      order: { revision: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return {
      items: items.map((s) => mapScenarioView(s)),
      pagination: buildRuntimeV2ListPagination(page, limit, total, 50),
    };
  }

  /**
   * Make final — crown this scenario as definitive. Does not write live schedules.
   */
  async markDefinitive(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      expectedRevision?: number;
    },
  ): Promise<ScheduleScenarioView> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);

    let scenario = await this.findOneOrFail(
      input.scheduleScenarioId,
      input.tenantId,
    );
    assertExpectedRevision(scenario, input.expectedRevision);

    if (scenario.status === 'archived') {
      throw new RpcException({
        statusCode: 400,
        message: 'Archived scenarios cannot be made definitive',
        errorCode: 'scenario_archived',
      });
    }

    if (scenario.status === 'definitive') {
      const requirement = await this.reqRepo.findOne({
        where: {
          schedulingRequirementId: scenario.schedulingRequirementId,
          tenantId: input.tenantId,
        },
      });
      return mapScenarioView(scenario, {
        definitiveScenarioId: requirement?.definitiveScenarioId ?? null,
      });
    }

    if (scenario.status === 'draft') {
      scenario = await this.setStatus(userId, {
        tenantId: input.tenantId,
        scheduleScenarioId: scenario.scheduleScenarioId,
        status: 'active',
        expectedRevision: scenario.revision,
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const scenarioRepo = manager.getRepository(ScheduleScenarioEntity);
      const reqRepo = manager.getRepository(SchedulingRequirementEntity);
      const versionRepo = manager.getRepository(ScheduleScenarioVersionEntity);

      const locked = await scenarioRepo.findOne({
        where: {
          scheduleScenarioId: input.scheduleScenarioId,
          tenantId: input.tenantId,
        },
      });
      if (!locked) {
        throw new RpcException(
          NO_RECORD_FOUND_MESSAGE.replaceAll(
            '{entity_name}',
            ScheduleScenarioEntity.name,
          ),
        );
      }

      const requirement = await reqRepo.findOne({
        where: {
          schedulingRequirementId: locked.schedulingRequirementId,
          tenantId: input.tenantId,
        },
      });
      if (!requirement) {
        throw new RpcException('Scheduling requirement not found');
      }
      if (requirement.status !== 'open') {
        throw new RpcException(
          `Requirement is ${requirement.status}; Make final is not allowed`,
        );
      }

      if (requirement.definitiveScenarioId) {
        await scenarioRepo.update(
          {
            scheduleScenarioId: requirement.definitiveScenarioId,
            tenantId: input.tenantId,
          },
          { status: 'archived' },
        );
      }

      const priorDefinitiveScenarioId = requirement.definitiveScenarioId;
      locked.status = 'definitive';
      if (requirement.activeScenarioId === locked.scheduleScenarioId) {
        requirement.activeScenarioId = null;
      }
      requirement.definitiveScenarioId = locked.scheduleScenarioId;
      locked.revision += 1;
      await scenarioRepo.save(locked);
      await reqRepo.save(requirement);

      const graph = await this.planning.loadScenarioGraph(
        locked.scheduleScenarioId,
      );
      const overlay = buildOverlayFromPlannedTasks(graph.plannedTasks);
      const nextVersion = await this.nextVersionNumber(
        versionRepo,
        locked.scheduleScenarioId,
      );
      const versionRow = await versionRepo.save(
        versionRepo.create({
          tenantId: input.tenantId,
          scheduleScenarioId: locked.scheduleScenarioId,
          version: nextVersion,
          summary: 'Scenario marked definitive',
          contentHash: hashOverlay(overlay),
          overlayJson: overlay as unknown as Record<string, unknown>,
          createdBy: userId,
        }),
      );

      await this.audit.appendEvent({
        schedulingRequirementId: locked.schedulingRequirementId,
        scheduleScenarioId: locked.scheduleScenarioId,
        actorUserId: userId,
        kind: 'status_changed',
        payload: {
          status: 'definitive',
          version: versionRow.version,
          priorDefinitiveScenarioId,
        },
      });

      this.logger.log(
        `Marked scenario ${locked.scheduleScenarioId} definitive for requirement ${locked.schedulingRequirementId}`,
      );

      return mapScenarioView(locked, {
        definitiveScenarioId: requirement.definitiveScenarioId,
      });
    });
  }

  /**
   * Save working overlay as a version history row and bump revision.
   */
  async save(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      expectedRevision?: number;
      summary?: string;
    },
  ): Promise<SaveScheduleScenarioResult> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);
    const scenario = await this.findOneOrFail(
      input.scheduleScenarioId,
      input.tenantId,
    );
    assertScenarioEditable(scenario.status);
    assertExpectedRevision(scenario, input.expectedRevision);

    const requirement = await this.requirements.findOneOrFail(
      scenario.schedulingRequirementId,
      input.tenantId,
    );
    assertRequirementOpen(requirement.status);

    const graph = await this.planning.loadScenarioGraph(
      scenario.scheduleScenarioId,
    );
    const overlay = buildOverlayFromPlannedTasks(graph.plannedTasks);

    return this.dataSource.transaction(async (manager) => {
      const scenarioRepo = manager.getRepository(ScheduleScenarioEntity);
      const versionRepo = manager.getRepository(ScheduleScenarioVersionEntity);

      const locked = await scenarioRepo.findOne({
        where: {
          scheduleScenarioId: input.scheduleScenarioId,
          tenantId: input.tenantId,
        },
      });
      if (!locked) {
        throw new RpcException(
          NO_RECORD_FOUND_MESSAGE.replaceAll(
            '{entity_name}',
            ScheduleScenarioEntity.name,
          ),
        );
      }
      assertExpectedRevision(locked, input.expectedRevision);
      assertScenarioEditable(locked.status);

      locked.revision += 1;
      await scenarioRepo.save(locked);

      const nextVersion = await this.nextVersionNumber(
        versionRepo,
        locked.scheduleScenarioId,
      );
      const versionRow = await versionRepo.save(
        versionRepo.create({
          tenantId: input.tenantId,
          scheduleScenarioId: locked.scheduleScenarioId,
          version: nextVersion,
          summary: input.summary?.trim() || 'Planning version saved',
          contentHash: hashOverlay(overlay),
          overlayJson: overlay as unknown as Record<string, unknown>,
          createdBy: userId,
        }),
      );

      await this.audit.appendEvent({
        schedulingRequirementId: locked.schedulingRequirementId,
        scheduleScenarioId: locked.scheduleScenarioId,
        actorUserId: userId,
        kind: 'updated',
        payload: { saved: true, version: versionRow.version },
      });

      return {
        scenario: mapScenarioView(locked, {
          definitiveScenarioId: requirement.definitiveScenarioId,
        }),
        version: mapVersionSummary(versionRow),
      };
    });
  }

  async listVersions(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      page?: number;
      limit?: number;
    },
  ): Promise<ListScheduleScenarioVersionsResult> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);
    await this.findOneOrFail(input.scheduleScenarioId, input.tenantId);

    const page = input.page || 1;
    const limit = Math.min(input.limit || 10, 50);
    const [items, total] = await this.versionRepo.findAndCount({
      where: {
        scheduleScenarioId: input.scheduleScenarioId,
        tenantId: input.tenantId,
      },
      order: { version: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      items: items.map(mapVersionSummary),
      pagination: buildRuntimeV2ListPagination(page, limit, total, 50),
    };
  }

  async getVersion(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      version: number;
    },
  ): Promise<ScheduleScenarioVersionDetailView> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);
    await this.findOneOrFail(input.scheduleScenarioId, input.tenantId);

    const row = await this.versionRepo.findOne({
      where: {
        scheduleScenarioId: input.scheduleScenarioId,
        tenantId: input.tenantId,
        version: input.version,
      },
    });
    if (!row) {
      throw new RpcException({
        statusCode: 404,
        message: 'Scenario version not found',
        errorCode: 'version_not_found',
      });
    }
    return mapVersionDetail(row);
  }

  async restoreVersion(
    userId: number,
    input: {
      tenantId: number;
      scheduleScenarioId: number;
      version: number;
      expectedRevision?: number;
    },
  ): Promise<RestoreScheduleScenarioVersionResult> {
    await this.tenantUsers.assertTenantAccess(userId, input.tenantId);
    const scenario = await this.findOneOrFail(
      input.scheduleScenarioId,
      input.tenantId,
    );
    assertScenarioEditable(scenario.status);
    assertExpectedRevision(scenario, input.expectedRevision);

    const requirement = await this.requirements.findOneOrFail(
      scenario.schedulingRequirementId,
      input.tenantId,
    );
    assertRequirementOpen(requirement.status);

    const source = await this.versionRepo.findOne({
      where: {
        scheduleScenarioId: input.scheduleScenarioId,
        tenantId: input.tenantId,
        version: input.version,
      },
    });
    if (!source) {
      throw new RpcException({
        statusCode: 404,
        message: 'Scenario version not found',
        errorCode: 'version_not_found',
      });
    }

    const overlay = parseOverlayJson(source.overlayJson);

    return this.dataSource.transaction(async (manager) => {
      const scenarioRepo = manager.getRepository(ScheduleScenarioEntity);
      const ptRepo = manager.getRepository(ScenarioPlannedTaskEntity);
      const shRepo = manager.getRepository(ScenarioPlannedShiftEntity);
      const asRepo = manager.getRepository(ScenarioResourceAssignmentEntity);
      const versionRepo = manager.getRepository(ScheduleScenarioVersionEntity);

      const locked = await scenarioRepo.findOne({
        where: {
          scheduleScenarioId: input.scheduleScenarioId,
          tenantId: input.tenantId,
        },
      });
      if (!locked) {
        throw new RpcException(
          NO_RECORD_FOUND_MESSAGE.replaceAll(
            '{entity_name}',
            ScheduleScenarioEntity.name,
          ),
        );
      }
      assertScenarioEditable(locked.status);
      assertExpectedRevision(locked, input.expectedRevision);

      const existing = await ptRepo.find({
        where: { scheduleScenarioId: locked.scheduleScenarioId },
        relations: ['shifts', 'assignments'],
      });
      for (const pt of existing) {
        if (pt.assignments?.length) {
          await asRepo.remove(pt.assignments);
        }
        if (pt.shifts?.length) {
          await shRepo.remove(pt.shifts);
        }
        await ptRepo.remove(pt);
      }

      await this.applyOverlay(ptRepo, shRepo, asRepo, locked.scheduleScenarioId, overlay);

      locked.revision += 1;
      await scenarioRepo.save(locked);

      const restoredOverlay = buildOverlayFromPlannedTasks(
        (
          await ptRepo.find({
            where: { scheduleScenarioId: locked.scheduleScenarioId },
            relations: ['shifts', 'assignments'],
            order: { plannedStartUtc: 'ASC' },
          })
        ),
      );
      const nextVersion = await this.nextVersionNumber(
        versionRepo,
        locked.scheduleScenarioId,
      );
      const versionRow = await versionRepo.save(
        versionRepo.create({
          tenantId: input.tenantId,
          scheduleScenarioId: locked.scheduleScenarioId,
          version: nextVersion,
          summary: `Restored from version ${input.version}`,
          contentHash: hashOverlay(restoredOverlay),
          overlayJson: restoredOverlay as unknown as Record<string, unknown>,
          createdBy: userId,
        }),
      );

      await this.audit.appendEvent({
        schedulingRequirementId: locked.schedulingRequirementId,
        scheduleScenarioId: locked.scheduleScenarioId,
        actorUserId: userId,
        kind: 'updated',
        payload: {
          restoredFromVersion: input.version,
          version: versionRow.version,
        },
      });

      return {
        scenario: mapScenarioView(locked, {
          definitiveScenarioId: requirement.definitiveScenarioId,
        }),
        restoredFromVersion: input.version,
        version: mapVersionSummary(versionRow),
      };
    });
  }

  async findOneOrFail(
    scheduleScenarioId: number,
    tenantId: number,
  ): Promise<ScheduleScenarioEntity> {
    const row = await this.scenarioRepo.findOne({
      where: { scheduleScenarioId, tenantId },
    });
    if (!row) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          ScheduleScenarioEntity.name,
        ),
      );
    }
    return row;
  }

  private async nextVersionNumber(
    versionRepo: Repository<ScheduleScenarioVersionEntity>,
    scheduleScenarioId: number,
  ): Promise<number> {
    const maxRow = await versionRepo
      .createQueryBuilder('v')
      .select('MAX(v.version)', 'max')
      .where('v.schedule_scenario_id = :id', { id: scheduleScenarioId })
      .getRawOne<{ max: string | null }>();
    return Number(maxRow?.max ?? 0) + 1;
  }

  private async applyOverlay(
    ptRepo: Repository<ScenarioPlannedTaskEntity>,
    shRepo: Repository<ScenarioPlannedShiftEntity>,
    asRepo: Repository<ScenarioResourceAssignmentEntity>,
    scheduleScenarioId: number,
    overlay: ScenarioOverlayJson,
  ): Promise<void> {
    for (const pt of overlay.plannedTasks ?? []) {
      const copied = await ptRepo.save(
        ptRepo.create({
          scheduleScenarioId,
          taskId: pt.taskId,
          plannedStartUtc: new Date(pt.plannedStartUtc),
          plannedEndUtc: new Date(pt.plannedEndUtc),
          tzUsed: pt.tzUsed ?? 'UTC',
          priority: pt.priority ?? 0,
          taskStatusId: pt.taskStatusId ?? null,
          notes: pt.notes ?? null,
          conflictSummary: pt.conflictSummary ?? null,
          constraintSnapshot: pt.constraintSnapshot ?? null,
          isPlanned: pt.isPlanned ?? true,
          isReady: pt.isReady ?? false,
          isMilestone: pt.isMilestone ?? false,
          planningKind: pt.planningKind ?? 'task',
          baselineStartUtc: pt.baselineStartUtc
            ? new Date(pt.baselineStartUtc)
            : null,
          baselineEndUtc: pt.baselineEndUtc
            ? new Date(pt.baselineEndUtc)
            : null,
          deadlineUtc: pt.deadlineUtc ? new Date(pt.deadlineUtc) : null,
        }),
      );
      for (const s of pt.shifts ?? []) {
        await shRepo.save(
          shRepo.create({
            scenarioPlannedTaskId: copied.scenarioPlannedTaskId,
            sequenceNo: s.sequenceNo,
            tenantUserId: s.tenantUserId ?? null,
            resourceId: s.resourceId ?? null,
            plannedStartUtc: new Date(s.plannedStartUtc),
            plannedEndUtc: new Date(s.plannedEndUtc),
          }),
        );
      }
      for (const a of pt.assignments ?? []) {
        await asRepo.save(
          asRepo.create({
            scenarioPlannedTaskId: copied.scenarioPlannedTaskId,
            resourceId: a.resourceId,
            assignedStart: new Date(a.assignedStart),
            assignedEnd: new Date(a.assignedEnd),
            scenarioPlannedShiftId: null,
          }),
        );
      }
    }
  }

  private async seedFromLive(
    scenario: ScheduleScenarioEntity,
    requirement: SchedulingRequirementEntity,
  ): Promise<void> {
    const taskIds = await this.requirements.resolveScopedTaskIds(requirement);
    if (!taskIds.length) return;

    const includeTerminal = requirement.promotePolicy.includeTerminal === true;
    const parents = await this.schedRepo.find({
      where: {
        taskId: In(taskIds),
        isActive: 1,
        parentScheduledTaskId: IsNull(),
      },
    });

    for (const parent of parents) {
      if (
        parent.effectiveEndUtc < requirement.horizonStartUtc ||
        parent.effectiveStartUtc > requirement.horizonEndUtc
      ) {
        continue;
      }
      if (
        !includeTerminal &&
        ['completed', 'cancelled', 'expired'].includes(parent.status)
      ) {
        continue;
      }

      const planned = await this.plannedTaskRepo.save(
        this.plannedTaskRepo.create({
          scheduleScenarioId: scenario.scheduleScenarioId,
          taskId: parent.taskId,
          plannedStartUtc: parent.effectiveStartUtc,
          plannedEndUtc: parent.effectiveEndUtc,
          tzUsed: parent.tzUsed,
          priority: parent.priority,
          taskStatusId: parent.taskStatusId,
          notes: null,
          conflictSummary: null,
          constraintSnapshot: {
            dependencyGateUtc: parent.dependencyGateUtc,
          },
        }),
      );

      const children = await this.schedRepo.find({
        where: {
          taskId: parent.taskId,
          isActive: 1,
          parentScheduledTaskId: parent.scheduledTaskId,
        },
        order: { effectiveStartUtc: 'ASC' },
      });

      let seq = 1;
      for (const child of children) {
        const liveShift = await this.liveShiftRepo.findOne({
          where: { scheduledTaskId: child.scheduledTaskId },
        });
        const liveAssignment = liveShift
          ? await this.liveAssignmentRepo.findOne({
              where: {
                resourceAssignmentId: liveShift.resourceAssignmentId,
              },
            })
          : await this.liveAssignmentRepo.findOne({
              where: { scheduledTaskId: child.scheduledTaskId },
            });

        await this.shiftRepo.save(
          this.shiftRepo.create({
            scenarioPlannedTaskId: planned.scenarioPlannedTaskId,
            sequenceNo: seq++,
            tenantUserId: child.tenantUserId ?? null,
            resourceId: liveAssignment?.resourceId ?? null,
            plannedStartUtc: child.effectiveStartUtc,
            plannedEndUtc: child.effectiveEndUtc,
          }),
        );

        if (liveAssignment) {
          await this.assignmentRepo.save(
            this.assignmentRepo.create({
              scenarioPlannedTaskId: planned.scenarioPlannedTaskId,
              resourceId: liveAssignment.resourceId,
              assignedStart: liveAssignment.assignedStart,
              assignedEnd: liveAssignment.assignedEnd,
              scenarioPlannedShiftId: null,
            }),
          );
        }
      }
    }
  }

  private async copyScenarioGraph(
    sourceScenarioId: number,
    target: ScheduleScenarioEntity,
  ): Promise<void> {
    const graph = await this.planning.loadScenarioGraph(sourceScenarioId);
    for (const pt of graph.plannedTasks) {
      const copied = await this.plannedTaskRepo.save(
        this.plannedTaskRepo.create({
          scheduleScenarioId: target.scheduleScenarioId,
          taskId: pt.taskId,
          plannedStartUtc: pt.plannedStartUtc,
          plannedEndUtc: pt.plannedEndUtc,
          tzUsed: pt.tzUsed,
          priority: pt.priority,
          taskStatusId: pt.taskStatusId,
          notes: pt.notes,
          conflictSummary: pt.conflictSummary,
          constraintSnapshot: pt.constraintSnapshot,
        }),
      );
      for (const s of pt.shifts ?? []) {
        await this.shiftRepo.save(
          this.shiftRepo.create({
            scenarioPlannedTaskId: copied.scenarioPlannedTaskId,
            sequenceNo: s.sequenceNo,
            tenantUserId: s.tenantUserId,
            resourceId: s.resourceId,
            plannedStartUtc: s.plannedStartUtc,
            plannedEndUtc: s.plannedEndUtc,
          }),
        );
      }
      for (const a of pt.assignments ?? []) {
        await this.assignmentRepo.save(
          this.assignmentRepo.create({
            scenarioPlannedTaskId: copied.scenarioPlannedTaskId,
            resourceId: a.resourceId,
            assignedStart: a.assignedStart,
            assignedEnd: a.assignedEnd,
            scenarioPlannedShiftId: null,
          }),
        );
      }
    }
  }
}
