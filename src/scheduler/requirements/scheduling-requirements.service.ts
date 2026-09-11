import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { In, Repository } from 'typeorm';
import {
  DEFAULT_PROMOTE_POLICY,
  SchedulingPromotePolicy,
  SchedulingRequirementEntity,
} from '../entities/scheduling_requirement.entity';
import { SchedulingRequirementMemberEntity } from '../entities/scheduling_requirement_member.entity';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';
import {
  NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE,
  NO_RECORD_FOUND_MESSAGE,
} from '../../common/constants';
import {
  SchedulingRequirementMemberType,
  SchedulingRequirementScopeType,
} from '../constants';
import { ScenarioAuditService } from '../scenarios/scenario-audit.service';
import {
  buildRuntimeV2ListPagination,
  type RuntimeV2ListPagination,
} from '../../common/runtime-v2-list-pagination';

export interface CreateSchedulingRequirementInput {
  tenantId: number;
  name: string;
  description?: string | null;
  scopeType: SchedulingRequirementScopeType;
  primaryProjectId?: number | null;
  horizonStartUtc: Date;
  horizonEndUtc: Date;
  requirementKey?: string | null;
  promotePolicy?: Partial<SchedulingPromotePolicy>;
  members?: Array<{
    memberType: SchedulingRequirementMemberType;
    memberId: number;
  }>;
  createdBy?: number | null;
}

export interface UpdateSchedulingRequirementInput {
  schedulingRequirementId: number;
  tenantId: number;
  name?: string;
  description?: string | null;
  horizonStartUtc?: Date;
  horizonEndUtc?: Date;
  promotePolicy?: Partial<SchedulingPromotePolicy>;
  members?: Array<{
    memberType: SchedulingRequirementMemberType;
    memberId: number;
  }>;
}

@Injectable()
export class SchedulingRequirementsService {
  private readonly logger = new Logger(SchedulingRequirementsService.name);

  constructor(
    @InjectRepository(SchedulingRequirementEntity)
    private readonly reqRepo: Repository<SchedulingRequirementEntity>,
    @InjectRepository(SchedulingRequirementMemberEntity)
    private readonly memberRepo: Repository<SchedulingRequirementMemberEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
    private readonly audit: ScenarioAuditService,
  ) {}

  async create(
    userId: number,
    input: CreateSchedulingRequirementInput,
  ): Promise<SchedulingRequirementEntity> {
    if (input.horizonEndUtc <= input.horizonStartUtc) {
      throw new RpcException('horizonEndUtc must be after horizonStartUtc');
    }
    if (input.scopeType === 'project' && !input.primaryProjectId) {
      throw new RpcException(
        'primaryProjectId is required when scopeType=project',
      );
    }
    if (
      input.scopeType === 'board' &&
      (!input.members || input.members.length === 0)
    ) {
      throw new RpcException(
        'Board requirements require at least one membership entry',
      );
    }

    const promotePolicy: SchedulingPromotePolicy = {
      ...DEFAULT_PROMOTE_POLICY,
      ...(input.promotePolicy ?? {}),
    };

    const row = this.reqRepo.create({
      tenantId: input.tenantId,
      name: input.name,
      description: input.description ?? null,
      scopeType: input.scopeType,
      primaryProjectId: input.primaryProjectId ?? null,
      horizonStartUtc: input.horizonStartUtc,
      horizonEndUtc: input.horizonEndUtc,
      requirementKey: input.requirementKey ?? null,
      status: 'open',
      promotePolicy,
      createdBy: input.createdBy ?? userId,
      activeScenarioId: null,
      finalScenarioId: null,
      syncedToLiveAt: null,
      syncedScenarioRevision: null,
    });
    const saved = await this.reqRepo.save(row);

    if (input.scopeType === 'board' && input.members?.length) {
      await this.replaceMembers(saved.schedulingRequirementId, input.members);
    }

    await this.audit.appendEvent({
      schedulingRequirementId: saved.schedulingRequirementId,
      actorUserId: userId,
      kind: 'created',
      payload: {
        scopeType: saved.scopeType,
        primaryProjectId: saved.primaryProjectId,
      },
    });

    this.logger.debug(
      `Created scheduling requirement ${saved.schedulingRequirementId}`,
    );
    return saved;
  }

  async update(
    userId: number,
    input: UpdateSchedulingRequirementInput,
  ): Promise<SchedulingRequirementEntity> {
    const row = await this.findOneOrFail(
      input.schedulingRequirementId,
      input.tenantId,
    );
    if (row.status !== 'open') {
      throw new RpcException(
        `Scheduling requirement is ${row.status} and cannot be updated`,
      );
    }

    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description;
    if (input.horizonStartUtc) row.horizonStartUtc = input.horizonStartUtc;
    if (input.horizonEndUtc) row.horizonEndUtc = input.horizonEndUtc;
    if (row.horizonEndUtc <= row.horizonStartUtc) {
      throw new RpcException('horizonEndUtc must be after horizonStartUtc');
    }
    if (input.promotePolicy) {
      row.promotePolicy = { ...row.promotePolicy, ...input.promotePolicy };
    }
    const saved = await this.reqRepo.save(row);

    if (input.members && row.scopeType === 'board') {
      await this.replaceMembers(saved.schedulingRequirementId, input.members);
    }

    await this.audit.appendEvent({
      schedulingRequirementId: saved.schedulingRequirementId,
      actorUserId: userId,
      kind: 'updated',
      payload: { fields: Object.keys(input) },
    });
    return saved;
  }

  async findOne(
    userId: number,
    schedulingRequirementId: number,
    tenantId: number,
  ): Promise<SchedulingRequirementEntity & { members: SchedulingRequirementMemberEntity[] }> {
    const row = await this.findOneOrFail(schedulingRequirementId, tenantId);
    const members = await this.memberRepo.find({
      where: { schedulingRequirementId },
    });
    return Object.assign(row, { members });
  }

  async findAll(
    userId: number,
    filters: {
      tenantId: number;
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    items: SchedulingRequirementEntity[];
    pagination: RuntimeV2ListPagination;
  }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 50);
    const where: Record<string, unknown> = { tenantId: filters.tenantId };
    if (filters.status) where.status = filters.status;

    const [items, total] = await this.reqRepo.findAndCount({
      where,
      order: { updatedAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    if (!items.length) {
      throw new RpcException(
        NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE.replace(
          '{entity_name}',
          SchedulingRequirementEntity.name,
        ),
      );
    }
    return {
      items,
      pagination: buildRuntimeV2ListPagination(page, limit, total, 50),
    };
  }

  async close(
    userId: number,
    schedulingRequirementId: number,
    tenantId: number,
  ): Promise<SchedulingRequirementEntity> {
    const row = await this.findOneOrFail(schedulingRequirementId, tenantId);
    row.status = 'closed';
    const saved = await this.reqRepo.save(row);
    await this.audit.appendEvent({
      schedulingRequirementId,
      actorUserId: userId,
      kind: 'status_changed',
      payload: { status: 'closed' },
    });
    return saved;
  }

  async findOneOrFail(
    schedulingRequirementId: number,
    tenantId: number,
  ): Promise<SchedulingRequirementEntity> {
    const row = await this.reqRepo.findOne({
      where: { schedulingRequirementId, tenantId },
    });
    if (!row) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replaceAll(
          '{entity_name}',
          SchedulingRequirementEntity.name,
        ),
      );
    }
    return row;
  }

  /**
   * Resolves task IDs in scope for a requirement (project = all project tasks;
   * board = explicit task members + tasks under member projects).
   */
  async resolveScopedTaskIds(
    requirement: SchedulingRequirementEntity,
  ): Promise<number[]> {
    if (requirement.scopeType === 'project') {
      if (!requirement.primaryProjectId) return [];
      const tasks = await this.taskRepo.find({
        where: {
          tenantId: requirement.tenantId,
          projectId: requirement.primaryProjectId,
        },
        select: ['taskId'],
      });
      return tasks.map((t) => t.taskId);
    }

    const members = await this.memberRepo.find({
      where: {
        schedulingRequirementId: requirement.schedulingRequirementId,
      },
    });
    const projectIds = members
      .filter((m) => m.memberType === 'project')
      .map((m) => m.memberId);
    const explicitTaskIds = members
      .filter((m) => m.memberType === 'task')
      .map((m) => m.memberId);

    const fromProjects =
      projectIds.length > 0
        ? (
            await this.taskRepo.find({
              where: {
                tenantId: requirement.tenantId,
                projectId: In(projectIds),
              },
              select: ['taskId'],
            })
          ).map((t) => t.taskId)
        : [];

    return Array.from(new Set([...fromProjects, ...explicitTaskIds]));
  }

  private async replaceMembers(
    schedulingRequirementId: number,
    members: Array<{
      memberType: SchedulingRequirementMemberType;
      memberId: number;
    }>,
  ): Promise<void> {
    await this.memberRepo.delete({ schedulingRequirementId });
    const rows = members.map((m) =>
      this.memberRepo.create({
        schedulingRequirementId,
        memberType: m.memberType,
        memberId: m.memberId,
      }),
    );
    if (rows.length) await this.memberRepo.save(rows);
  }
}
