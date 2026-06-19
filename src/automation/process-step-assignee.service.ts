import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ProcessInstanceStepAssigneeEntity } from '../process_instances/process_instance_steps/entities/process_instance_step_assignee.entity';
import type { ProcessStepAssigneeResolution } from '../process_instances/interfaces/process-step-assignee.interface';
import { ProcessStepAssigneeResolverService } from './process-step-assignee-resolver.service';
import {
  parseAssigneeSpec,
  type ProcessStepAssigneeResolveContext,
} from './process-step-assignee-spec.types';

type ResolveAndPersistParams = {
  stepInstanceId: number;
  tenantId: number;
  actorTenantUserId?: number;
};

@Injectable()
export class ProcessStepAssigneeService {
  private readonly logger = new Logger(ProcessStepAssigneeService.name);

  constructor(
    @InjectRepository(ProcessInstanceStepAssigneeEntity)
    private readonly assigneeRepository: Repository<ProcessInstanceStepAssigneeEntity>,
    private readonly assigneeResolver: ProcessStepAssigneeResolverService,
  ) {}

  async resolveForStep(
    stepInstanceId: number,
    manager?: EntityManager,
  ): Promise<ProcessStepAssigneeResolution> {
    const repo = manager
      ? manager.getRepository(ProcessInstanceStepAssigneeEntity)
      : this.assigneeRepository;

    const rows = await repo.find({
      where: { stepInstanceId },
      order: { assignmentOrder: 'ASC', instanceStepAssigneeId: 'ASC' },
    });

    const assigneeIds = rows.map((row) => row.tenantUserId);
    return {
      assigneeIds,
      primaryAssigneeId: assigneeIds[0] ?? null,
    };
  }

  /**
   * Resolves instance-step `assignee_spec` and writes `process_instance_step_assignees`.
   * Clears existing rows when spec is empty or resolves to no users.
   */
  async resolveAndPersistForStep(
    params: ResolveAndPersistParams,
    manager?: EntityManager,
  ): Promise<ProcessStepAssigneeResolution> {
    const em = manager ?? this.assigneeRepository.manager;
    const context = await this.loadResolveContext(
      params.stepInstanceId,
      params.tenantId,
      params.actorTenantUserId,
      em,
    );

    if (!context) {
      this.logger.warn(
        `Skipping assignee resolution — step ${params.stepInstanceId} not found`,
      );
      return { assigneeIds: [], primaryAssigneeId: null };
    }

    const spec = parseAssigneeSpec(context.assigneeSpecRaw);
    await this.clearAssigneesForStep(params.stepInstanceId, em);

    if (!spec) {
      return { assigneeIds: [], primaryAssigneeId: null };
    }

    const { assigneeSpecRaw: _raw, ...resolveCtx } = context;
    const tenantUserIds = await this.assigneeResolver.resolveTenantUserIds(
      spec,
      resolveCtx,
    );

    if (tenantUserIds.length === 0) {
      return { assigneeIds: [], primaryAssigneeId: null };
    }

    const repo = em.getRepository(ProcessInstanceStepAssigneeEntity);
    const rows = tenantUserIds.map((tenantUserId, index) =>
      repo.create({
        stepInstanceId: params.stepInstanceId,
        tenantUserId,
        assignmentOrder: index,
      }),
    );
    await repo.save(rows);

    return {
      assigneeIds: tenantUserIds,
      primaryAssigneeId: tenantUserIds[0] ?? null,
    };
  }

  async loadAssigneesByStepIds(
    stepInstanceIds: number[],
  ): Promise<Map<number, ProcessInstanceStepAssigneeEntity[]>> {
    const map = new Map<number, ProcessInstanceStepAssigneeEntity[]>();
    if (!stepInstanceIds.length) {
      return map;
    }

    const rows = await this.assigneeRepository
      .createQueryBuilder('assignee')
      .where('assignee.stepInstanceId IN (:...stepInstanceIds)', {
        stepInstanceIds,
      })
      .orderBy('assignee.assignmentOrder', 'ASC')
      .addOrderBy('assignee.instanceStepAssigneeId', 'ASC')
      .getMany();

    for (const row of rows) {
      const list = map.get(row.stepInstanceId) ?? [];
      list.push(row);
      map.set(row.stepInstanceId, list);
    }

    return map;
  }

  private async loadResolveContext(
    stepInstanceId: number,
    tenantId: number,
    actorTenantUserId: number | undefined,
    em: EntityManager,
  ): Promise<
    (ProcessStepAssigneeResolveContext & { assigneeSpecRaw: unknown }) | null
  > {
    const [row] = await em.query(
      `SELECT pis.assignee_spec,
              pis.process_instance_id,
              pi.tenant_id,
              pi.subject_type,
              pi.subject_id,
              pi.subject_metadata,
              pi.context
         FROM process_instance_steps pis
         INNER JOIN process_instances pi
           ON pi.process_instance_id = pis.process_instance_id
        WHERE pis.step_instance_id = ?
        LIMIT 1`,
      [stepInstanceId],
    );

    if (!row) {
      return null;
    }

    const subjectMetadata = parseJsonObject(row.subject_metadata);
    const context = parseJsonObject(row.context);

    return {
      tenantId: Number(row.tenant_id) || tenantId,
      processInstanceId: Number(row.process_instance_id),
      stepInstanceId,
      actorTenantUserId,
      subjectType: String(row.subject_type ?? ''),
      subjectId: Number(row.subject_id) || 0,
      subjectMetadata,
      context,
      assigneeSpecRaw: row.assignee_spec,
    };
  }

  private async clearAssigneesForStep(
    stepInstanceId: number,
    em: EntityManager,
  ): Promise<void> {
    await em.query(
      `DELETE FROM process_instance_step_assignees WHERE step_instance_id = ?`,
      [stepInstanceId],
    );
  }
}

function parseJsonObject(
  raw: unknown,
): Record<string, unknown> | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}
