import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { ConfigObjectEntity } from './entities/config_object.entity';
import { ConfigObjectLifecycleEntity } from './entities/config_object_lifecycle.entity';
import { ConfigObjectLifecycleTransitionEntity } from './entities/config_object_lifecycle_transition.entity';
import { ConfigObjectFieldRuleEntity } from './entities/config_object_field_rule.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { TaskEntity } from '../projects/tasks/entities/task.entity';
import { ProjectStepStatusMappingEntity } from '../projects/entities/project_step_status_mappings.entity';
import { ConfigTemplateSetEntity } from './entities/config_template_set.entity';
import { ConfigAuditLogEntity } from './entities/config_audit_log.entity';

/**
 * Service responsible for evaluating and enforcing lifecycle transitions
 * and field-level rules for configurable objects.
 *
 * @version 0.0.1
 */
@Injectable()
export class ConfigLifecycleService {
  constructor(
    @InjectRepository(ConfigObjectEntity)
    private readonly configObjectRepository: Repository<ConfigObjectEntity>,
    @InjectRepository(ConfigObjectLifecycleEntity)
    private readonly lifecycleRepository: Repository<ConfigObjectLifecycleEntity>,
    @InjectRepository(ConfigObjectLifecycleTransitionEntity)
    private readonly transitionRepository: Repository<ConfigObjectLifecycleTransitionEntity>,
    @InjectRepository(ConfigObjectFieldRuleEntity)
    private readonly fieldRuleRepository: Repository<ConfigObjectFieldRuleEntity>,
    @InjectRepository(ProjectStepStatusMappingEntity)
    private readonly statusMappingRepository: Repository<ProjectStepStatusMappingEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(ConfigTemplateSetEntity)
    private readonly templateSetRepository: Repository<ConfigTemplateSetEntity>,
    @InjectRepository(ConfigAuditLogEntity)
    private readonly configAuditLogRepository: Repository<ConfigAuditLogEntity>,
  ) {}

  /**
   * Normalizes nullable tenant identifiers to an effective value.
   *
   * We use `0` to represent system/global scope, and positive integers for
   * tenant-scoped configuration.
   */
  private getEffectiveTenantId(tenantId: number | null | undefined): number {
    return typeof tenantId === 'number' ? tenantId : 0;
  }

  /**
   * First published template set for the scope. Super-admin / global (`0`) uses
   * any published set; tenant scope requires a matching `tenant_id`.
   */
  private async findPublishedTemplateSetForScope(
    effectiveTenantId: number,
  ): Promise<ConfigTemplateSetEntity | null> {
    const where =
      effectiveTenantId > 0
        ? { tenantId: effectiveTenantId, status: 'PUBLISHED' as const }
        : { status: 'PUBLISHED' as const };
    return this.templateSetRepository.findOne({
      where,
      order: { configTemplateSetId: 'ASC' },
    });
  }

  /**
   * Where clause to verify a config object's template set belongs to the scope.
   * Global scope matches by `configTemplateSetId` only (tenant-owned sets).
   */
  private templateSetWhereForMembershipScope(
    configTemplateSetId: number,
    effectiveTenantId: number,
  ):
    | { configTemplateSetId: number }
    | { configTemplateSetId: number; tenantId: number } {
    if (effectiveTenantId > 0) {
      return { configTemplateSetId, tenantId: effectiveTenantId };
    }
    return { configTemplateSetId };
  }

  /**
   * Validates whether a status change for a project is allowed by the configured lifecycle.
   *
   * @param project - Project entity being updated.
   * @param nextStatus - Next status value requested by the update DTO.
   * @throws RpcException when the transition is not allowed by configuration.
   */
  async validateProjectStatusTransition(
    project: ProjectEntity,
    nextStatus: ProjectEntity['status'],
  ): Promise<void> {
    if (project.status === nextStatus) {
      return;
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        objectType: 'project',
        status: 'PUBLISHED',
      },
    });

    if (!configObject) {
      return;
    }

    const fromStateKey = project.status;
    const toStateKey = nextStatus;

    const transition = await this.transitionRepository.findOne({
      where: {
        configObjectId: configObject.configObjectId,
        fromStateKey,
        toStateKey,
      },
    });

    if (!transition) {
      throw new RpcException(
        `Invalid project status transition from "${fromStateKey}" to "${toStateKey}"`,
      );
    }
  }

  /**
   * Validates whether a status change for a task is allowed by the configured lifecycle.
   *
   * @param task - Task entity being updated.
   * @param nextStatusId - Next project task status identifier.
   *
   * Note: This method currently expects that mapping from lifecycle state to
   * concrete project_task_statuses is handled elsewhere. For now, it only ensures
   * that when a lifecycle is configured, a transition record exists.
   */
  async validateTaskStatusTransition(
    task: TaskEntity,
    nextStatusId: number,
  ): Promise<void> {
    if (task.taskStatusId === nextStatusId) {
      return;
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        objectType: 'task',
        status: 'PUBLISHED',
      },
    });

    if (!configObject) {
      return;
    }

    // Map concrete task status IDs to lifecycle state keys using
    // project_step_status_mappings. This aligns lifecycle configuration with
    // engine states (pending, ready, in_progress, etc.) as per the Phase 2 plan.
    const [fromMapping, toMapping] = await Promise.all([
      this.statusMappingRepository.findOne({
        where: {
          projectId: task.projectId,
          taskStatusId: task.taskStatusId,
        },
      }),
      this.statusMappingRepository.findOne({
        where: {
          projectId: task.projectId,
          taskStatusId: nextStatusId,
        },
      }),
    ]);

    const fromStateKey = fromMapping
      ? fromMapping.stepEngineState
      : String(task.taskStatusId);
    const toStateKey = toMapping
      ? toMapping.stepEngineState
      : String(nextStatusId);

    const transition = await this.transitionRepository.findOne({
      where: {
        configObjectId: configObject.configObjectId,
        fromStateKey,
        toStateKey,
      },
    });

    if (!transition) {
      throw new RpcException(
        `Invalid task status transition from "${fromStateKey}" to "${toStateKey}"`,
      );
    }
  }

  /**
   * Creates a new lifecycle state for a configurable object type.
   */
  async createLifecycle(params: {
    tenantId: number | null | undefined;
    configTemplateSetId: number;
    objectType: string;
    createdBy: number;
    stateKey: string;
    label: string;
    description?: string | null;
    orderIndex?: number;
  }): Promise<ConfigObjectLifecycleEntity> {
    const {
      tenantId,
      configTemplateSetId,
      objectType,
      createdBy,
      stateKey,
      label,
      description,
      orderIndex,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const templateSet = await this.templateSetRepository.findOne({
      where:
        effectiveTenantId > 0
          ? {
              configTemplateSetId,
              tenantId: effectiveTenantId,
              status: 'PUBLISHED',
            }
          : {
              configTemplateSetId,
              status: 'PUBLISHED',
            },
    });

    if (!templateSet) {
      throw new RpcException(
        'No active configuration template set found for the provided scope.',
      );
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configTemplateSetId,
        objectType,
        status: 'PUBLISHED',
      },
    });

    if (!configObject) {
      throw new RpcException(
        `No active config object found for type "${objectType}".`,
      );
    }

    const existing = await this.lifecycleRepository.findOne({
      where: {
        configObjectId: configObject.configObjectId,
        stateKey,
      },
    });

    if (existing) {
      return existing;
    }

    const lifecycle = this.lifecycleRepository.create({
      configObjectId: configObject.configObjectId,
      stateKey,
      label,
      description: typeof description === 'undefined' ? null : description,
      orderIndex: typeof orderIndex === 'number' ? orderIndex : 0,
    });

    const saved = await this.lifecycleRepository.save(lifecycle);

    await this.logConfigChange(
      effectiveTenantId,
      'lifecycle',
      saved.configObjectLifecycleId,
      'create',
      createdBy,
      null,
      {
        configObjectId: saved.configObjectId,
        stateKey: saved.stateKey,
        label: saved.label,
        description: saved.description ?? null,
        orderIndex: saved.orderIndex,
      },
    );

    return saved;
  }

  /**
   * Updates an existing lifecycle state.
   */
  async updateLifecycle(params: {
    tenantId: number | null | undefined;
    configObjectLifecycleId: number;
    updatedBy: number;
    label?: string;
    description?: string | null;
    orderIndex?: number;
  }): Promise<ConfigObjectLifecycleEntity> {
    const {
      tenantId,
      configObjectLifecycleId,
      updatedBy,
      label,
      description,
      orderIndex,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const lifecycle = await this.lifecycleRepository.findOne({
      where: { configObjectLifecycleId },
    });

    if (!lifecycle) {
      throw new RpcException('Lifecycle state not found.');
    }

    const configObject = await this.configObjectRepository.findOne({
      where: { configObjectId: lifecycle.configObjectId },
    });

    if (!configObject) {
      throw new RpcException('Config object not found for lifecycle.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForMembershipScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Lifecycle does not belong to the specified tenant.',
      );
    }

    const oldValue = {
      label: lifecycle.label,
      description: lifecycle.description ?? null,
      orderIndex: lifecycle.orderIndex,
    };

    if (typeof label === 'string') {
      lifecycle.label = label;
    }
    if (typeof description !== 'undefined') {
      lifecycle.description = description;
    }
    if (typeof orderIndex === 'number') {
      lifecycle.orderIndex = orderIndex;
    }

    const saved = await this.lifecycleRepository.save(lifecycle);

    await this.logConfigChange(
      effectiveTenantId,
      'lifecycle',
      saved.configObjectLifecycleId,
      'update',
      updatedBy,
      oldValue,
      {
        label: saved.label,
        description: saved.description ?? null,
        orderIndex: saved.orderIndex,
      },
    );

    return saved;
  }

  /**
   * Deletes a lifecycle state.
   */
  async deleteLifecycle(params: {
    tenantId: number | null | undefined;
    configObjectLifecycleId: number;
    deletedBy: number;
  }): Promise<void> {
    const { tenantId, configObjectLifecycleId, deletedBy } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const lifecycle = await this.lifecycleRepository.findOne({
      where: { configObjectLifecycleId },
    });

    if (!lifecycle) {
      return;
    }

    const configObject = await this.configObjectRepository.findOne({
      where: { configObjectId: lifecycle.configObjectId },
    });

    if (!configObject) {
      throw new RpcException('Config object not found for lifecycle.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForMembershipScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Lifecycle does not belong to the specified tenant.',
      );
    }

    const oldValue = {
      configObjectId: lifecycle.configObjectId,
      stateKey: lifecycle.stateKey,
      label: lifecycle.label,
      description: lifecycle.description ?? null,
      orderIndex: lifecycle.orderIndex,
    };

    await this.lifecycleRepository.remove(lifecycle);

    await this.logConfigChange(
      effectiveTenantId,
      'lifecycle',
      configObjectLifecycleId,
      'delete',
      deletedBy,
      oldValue,
      null,
    );
  }

  /**
   * Creates a lifecycle transition between states for a given object type.
   */
  async createLifecycleTransition(params: {
    tenantId: number | null | undefined;
    configTemplateSetId: number;
    objectType: string;
    createdBy: number;
    fromStateKey: string;
    toStateKey: string;
    rulesJson?: string | null;
  }): Promise<ConfigObjectLifecycleTransitionEntity> {
    const {
      tenantId,
      configTemplateSetId,
      objectType,
      createdBy,
      fromStateKey,
      toStateKey,
      rulesJson,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const templateSet = await this.templateSetRepository.findOne({
      where:
        effectiveTenantId > 0
          ? {
              configTemplateSetId,
              tenantId: effectiveTenantId,
              status: 'PUBLISHED',
            }
          : {
              configTemplateSetId,
              status: 'PUBLISHED',
            },
    });

    if (!templateSet) {
      throw new RpcException(
        'No active configuration template set found for the provided scope.',
      );
    }

    const configObject = await this.configObjectRepository.findOne({
      where: {
        configTemplateSetId,
        objectType,
        status: 'PUBLISHED',
      },
    });

    if (!configObject) {
      throw new RpcException(
        `No active config object found for type "${objectType}".`,
      );
    }

    const existing = await this.transitionRepository.findOne({
      where: {
        configObjectId: configObject.configObjectId,
        fromStateKey,
        toStateKey,
      },
    });

    if (existing) {
      throw new RpcException(
        `Lifecycle transition from "${fromStateKey}" to "${toStateKey}" already exists.`,
      );
    }

    const transition = this.transitionRepository.create({
      configObjectId: configObject.configObjectId,
      fromStateKey,
      toStateKey,
      rulesJson: typeof rulesJson === 'string' ? JSON.parse(rulesJson) : null,
    });

    const saved = await this.transitionRepository.save(transition);

    await this.logConfigChange(
      effectiveTenantId,
      'lifecycle_transition',
      saved.configObjectLifecycleTransitionId,
      'create',
      createdBy,
      null,
      {
        configObjectId: saved.configObjectId,
        fromStateKey: saved.fromStateKey,
        toStateKey: saved.toStateKey,
        rulesJson: saved.rulesJson ?? null,
      },
    );

    return saved;
  }

  /**
   * Updates an existing lifecycle transition.
   */
  async updateLifecycleTransition(params: {
    tenantId: number | null | undefined;
    configObjectLifecycleTransitionId: number;
    updatedBy: number;
    rulesJson?: string | null;
  }): Promise<ConfigObjectLifecycleTransitionEntity> {
    const {
      tenantId,
      configObjectLifecycleTransitionId,
      updatedBy,
      rulesJson,
    } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const transition = await this.transitionRepository.findOne({
      where: { configObjectLifecycleTransitionId },
    });

    if (!transition) {
      throw new RpcException('Lifecycle transition not found.');
    }

    const configObject = await this.configObjectRepository.findOne({
      where: { configObjectId: transition.configObjectId },
    });

    if (!configObject) {
      throw new RpcException('Config object not found for transition.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForMembershipScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Lifecycle transition does not belong to the specified tenant.',
      );
    }

    const oldValue = {
      rulesJson: transition.rulesJson ?? null,
    };

    if (typeof rulesJson !== 'undefined') {
      transition.rulesJson =
        typeof rulesJson === 'string' ? JSON.parse(rulesJson) : null;
    }

    const saved = await this.transitionRepository.save(transition);

    await this.logConfigChange(
      effectiveTenantId,
      'lifecycle_transition',
      saved.configObjectLifecycleTransitionId,
      'update',
      updatedBy,
      oldValue,
      {
        rulesJson: saved.rulesJson ?? null,
      },
    );

    return saved;
  }

  /**
   * Deletes a lifecycle transition.
   */
  async deleteLifecycleTransition(params: {
    tenantId: number | null | undefined;
    configObjectLifecycleTransitionId: number;
    deletedBy: number;
  }): Promise<void> {
    const { tenantId, configObjectLifecycleTransitionId, deletedBy } = params;

    const effectiveTenantId = this.getEffectiveTenantId(tenantId);

    const transition = await this.transitionRepository.findOne({
      where: { configObjectLifecycleTransitionId },
    });

    if (!transition) {
      return;
    }

    const configObject = await this.configObjectRepository.findOne({
      where: { configObjectId: transition.configObjectId },
    });

    if (!configObject) {
      throw new RpcException('Config object not found for transition.');
    }

    const templateSet = await this.templateSetRepository.findOne({
      where: this.templateSetWhereForMembershipScope(
        configObject.configTemplateSetId,
        effectiveTenantId,
      ),
    });

    if (!templateSet) {
      throw new RpcException(
        'Lifecycle transition does not belong to the specified tenant.',
      );
    }

    const oldValue = {
      configObjectId: transition.configObjectId,
      fromStateKey: transition.fromStateKey,
      toStateKey: transition.toStateKey,
      rulesJson: transition.rulesJson ?? null,
    };

    await this.transitionRepository.remove(transition);

    await this.logConfigChange(
      effectiveTenantId,
      'lifecycle_transition',
      configObjectLifecycleTransitionId,
      'delete',
      deletedBy,
      oldValue,
      null,
    );
  }

  /**
   * Returns current lifecycle state and allowed transitions for a given
   * instance (project or task).
   */
  async getInstanceLifecycleState(params: {
    tenantId: number;
    objectType: string;
    coreId: number;
  }): Promise<{
    objectType: string;
    coreId: number;
    tenantId: number;
    currentLifecycleState: string | null;
    allowedTransitions: {
      toStateKey: string;
      rulesJson: Record<string, unknown> | null;
    }[];
  }> {
    const { tenantId, objectType, coreId } = params;

    if (objectType === 'project') {
      const project = await this.projectRepository.findOne({
        where: { projectId: coreId },
      });

      if (!project || project.tenantId !== tenantId) {
        throw new RpcException(
          'Requested project does not belong to the specified tenant.',
        );
      }

      const currentStateKey = project.status;
      const transitions = await this.getTransitionsForObjectTypeAndState(
        'project',
        currentStateKey,
      );

      return {
        objectType,
        coreId,
        tenantId,
        currentLifecycleState: currentStateKey,
        allowedTransitions: transitions,
      };
    }

    if (objectType === 'task') {
      const task = await this.taskRepository.findOne({
        where: { taskId: coreId },
      });

      if (!task || task.tenantId !== tenantId) {
        throw new RpcException(
          'Requested task does not belong to the specified tenant.',
        );
      }

      const mapping = await this.statusMappingRepository.findOne({
        where: {
          projectId: task.projectId,
          taskStatusId: task.taskStatusId,
        },
      });

      const currentStateKey = mapping
        ? mapping.stepEngineState
        : String(task.taskStatusId);

      const transitions = await this.getTransitionsForObjectTypeAndState(
        'task',
        currentStateKey,
      );

      return {
        objectType,
        coreId,
        tenantId,
        currentLifecycleState: currentStateKey,
        allowedTransitions: transitions,
      };
    }

    return {
      objectType,
      coreId,
      tenantId,
      currentLifecycleState: null,
      allowedTransitions: [],
    };
  }

  private async getTransitionsForObjectTypeAndState(
    objectType: string,
    fromStateKey: string,
  ): Promise<
    { toStateKey: string; rulesJson: Record<string, unknown> | null }[]
  > {
    const configObject = await this.configObjectRepository.findOne({
      where: {
        objectType,
        status: 'PUBLISHED',
      },
    });

    if (!configObject) {
      return [];
    }

    const transitions = await this.transitionRepository.find({
      where: {
        configObjectId: configObject.configObjectId,
        fromStateKey,
      },
    });

    return transitions.map((t) => ({
      toStateKey: t.toStateKey,
      rulesJson: t.rulesJson ?? null,
    }));
  }

  private async logConfigChange(
    tenantId: number,
    entityType: string,
    entityId: number,
    action: 'create' | 'update' | 'delete',
    changedBy: number,
    oldValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null,
  ): Promise<void> {
    const audit = this.configAuditLogRepository.create({
      tenantId,
      entityType,
      entityId,
      action,
      changedBy,
      oldValue,
      newValue,
    });

    await this.configAuditLogRepository.save(audit);
  }
}
