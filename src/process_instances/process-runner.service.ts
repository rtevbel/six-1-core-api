import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { ProcessInstanceEntity } from './entities/process_instance.entity';
import { NO_RECORD_FOUND_MESSAGE } from '../common/constants';
import type {
  ProcessRunnerChildSummary,
  ProcessRunnerPayload,
  ProcessRunnerStep,
  ProcessRunnerStepObjectBinding,
  ProcessRunnerStepRequirement,
  ProcessRunnerStepTrigger,
} from './interfaces/process-runner-payload.interface';

type StepRow = {
  step_instance_id: number;
  process_instance_id: number;
  step_order: number;
  name: string | null;
  task_type: string;
  status: string;
  is_optional: number;
  blocked_reason: string | null;
};

@Injectable()
export class ProcessRunnerService {
  constructor(
    @InjectRepository(ProcessInstanceEntity)
    private readonly processInstanceRepository: Repository<ProcessInstanceEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Builds the aggregated Process Runner view for a single process instance.
   */
  async buildPayload(
    _userId: number,
    processInstanceId: number,
    tenantId?: number,
  ): Promise<ProcessRunnerPayload> {
    const instance = await this.processInstanceRepository.findOne({
      where:
        tenantId != null
          ? { processInstanceId, tenantId }
          : { processInstanceId },
    });

    if (!instance) {
      throw new RpcException(
        NO_RECORD_FOUND_MESSAGE.replace('{entity_name}', 'ProcessInstance'),
      );
    }

    const steps = await this.loadSteps(processInstanceId);
    const stepIds = steps.map((s) => s.step_instance_id);

    const [requirements, triggers, objectBindings, children] = await Promise.all([
      this.loadRequirements(stepIds),
      this.loadTriggers(stepIds),
      this.loadObjectBindings(stepIds),
      this.loadChildSummaries(processInstanceId),
    ]);

    const childByParentStep = new Map<number, number>();
    for (const child of children) {
      childByParentStep.set(child.parentStepInstanceId, child.processInstanceId);
    }

    const requirementsByStep = groupBy(requirements);
    const triggersByStep = groupBy(triggers);

    const runnerSteps: ProcessRunnerStep[] = steps.map((step) =>
      this.mapStep(
        step,
        (requirementsByStep.get(step.step_instance_id) ?? []).map(
          stripStepIdFromRequirement,
        ),
        (triggersByStep.get(step.step_instance_id) ?? []).map(
          stripStepIdFromTrigger,
        ),
        objectBindings.get(step.step_instance_id) ?? [],
        childByParentStep.get(step.step_instance_id),
      ),
    );

    return {
      processInstanceId: instance.processInstanceId,
      processTemplateId: instance.processTemplateId,
      tenantId: instance.tenantId,
      status: instance.status,
      subject: {
        type: instance.subjectType,
        id: instance.subjectId,
        metadata: instance.subjectMetadata,
      },
      context: instance.context,
      correlationId: instance.correlationId,
      parentInstanceId: instance.parentInstanceId,
      children,
      steps: runnerSteps,
      currentStepInstanceId: resolveCurrentStepInstanceId(runnerSteps),
    };
  }

  private async loadSteps(processInstanceId: number): Promise<StepRow[]> {
    return this.dataSource.query(
      `SELECT step_instance_id,
              process_instance_id,
              step_order,
              name,
              task_type,
              status,
              is_optional,
              blocked_reason
         FROM process_instance_steps
        WHERE process_instance_id = ?
        ORDER BY step_order ASC, step_instance_id ASC`,
      [processInstanceId],
    );
  }

  private async loadRequirements(
    stepIds: number[],
  ): Promise<(ProcessRunnerStepRequirement & { stepInstanceId: number })[]> {
    if (!stepIds.length) {
      return [];
    }

    const rows = await this.dataSource.query(
      `SELECT requirement_instance_id AS requirementInstanceId,
              step_instance_id AS stepInstanceId,
              process_template_step_requirement_id AS processTemplateStepRequirementId,
              requirement_type AS requirementType,
              requirement_key AS requirementKey,
              json_schema AS jsonSchema,
              is_mandatory AS isMandatory,
              status,
              last_submission_id AS lastSubmissionId,
              approved_at AS approvedAt
         FROM process_instance_step_requirements
        WHERE step_instance_id IN (${stepIds.map(() => '?').join(',')})
        ORDER BY requirement_instance_id ASC`,
      stepIds,
    );

    return rows.map((row: Record<string, unknown>) => ({
      requirementInstanceId: Number(row.requirementInstanceId),
      stepInstanceId: Number(row.stepInstanceId),
      processTemplateStepRequirementId: Number(
        row.processTemplateStepRequirementId,
      ),
      requirementType: String(row.requirementType),
      requirementKey: String(row.requirementKey),
      jsonSchema: parseJsonColumn(row.jsonSchema),
      isMandatory: Boolean(Number(row.isMandatory)),
      status: String(row.status),
      lastSubmissionId:
        row.lastSubmissionId != null ? Number(row.lastSubmissionId) : null,
      approvedAt: row.approvedAt
        ? new Date(String(row.approvedAt)).toISOString()
        : null,
    }));
  }

  private async loadTriggers(stepIds: number[]): Promise<
    (ProcessRunnerStepTrigger & { stepInstanceId: number })[]
  > {
    if (!stepIds.length) {
      return [];
    }

    const rows = await this.dataSource.query(
      `SELECT trigger_instance_id AS triggerInstanceId,
              step_instance_id AS stepInstanceId,
              process_template_step_trigger_condition_id AS processTemplateStepTriggerConditionId,
              condition_type AS conditionType,
              condition_key AS conditionKey,
              json_schema AS jsonSchema,
              status,
              met_at AS metAt
         FROM process_instance_step_triggers
        WHERE step_instance_id IN (${stepIds.map(() => '?').join(',')})
        ORDER BY trigger_instance_id ASC`,
      stepIds,
    );

    return rows.map((row: Record<string, unknown>) => ({
      triggerInstanceId: Number(row.triggerInstanceId),
      processTemplateStepTriggerConditionId: Number(
        row.processTemplateStepTriggerConditionId,
      ),
      conditionType: String(row.conditionType),
      conditionKey: String(row.conditionKey),
      jsonSchema: parseJsonColumn(row.jsonSchema),
      status: String(row.status),
      metAt: row.metAt ? new Date(String(row.metAt)).toISOString() : null,
      stepInstanceId: Number(row.stepInstanceId),
    }));
  }

  private async loadObjectBindings(
    stepIds: number[],
  ): Promise<Map<number, ProcessRunnerStepObjectBinding[]>> {
    const map = new Map<number, ProcessRunnerStepObjectBinding[]>();
    if (!stepIds.length) {
      return map;
    }

    const rows = await this.dataSource.query(
      `SELECT oi.step_object_instance_id,
              oi.step_instance_id,
              oi.binding_id,
              oi.config_object_id,
              oi.config_custom_object_instance_id,
              oi.status,
              oi.last_error,
              co.object_type
         FROM process_instance_step_object_instances oi
         JOIN config_objects co ON co.config_object_id = oi.config_object_id
        WHERE oi.step_instance_id IN (${stepIds.map(() => '?').join(',')})
        ORDER BY oi.step_object_instance_id ASC`,
      stepIds,
    );

    for (const row of rows) {
      const stepId = Number(row.step_instance_id);
      const binding: ProcessRunnerStepObjectBinding = {
        stepObjectInstanceId: Number(row.step_object_instance_id),
        bindingId: row.binding_id != null ? Number(row.binding_id) : null,
        configObjectId: Number(row.config_object_id),
        objectType: String(row.object_type),
        status: String(row.status),
        lastError: row.last_error ?? null,
        schemaRef: String(row.object_type),
      };
      const instanceId =
        row.config_custom_object_instance_id != null
          ? Number(row.config_custom_object_instance_id)
          : undefined;
      if (instanceId) {
        binding.instanceId = instanceId;
      }
      const list = map.get(stepId) ?? [];
      list.push(binding);
      map.set(stepId, list);
    }

    return map;
  }

  private async loadChildSummaries(
    processInstanceId: number,
  ): Promise<ProcessRunnerChildSummary[]> {
    const rows = await this.dataSource.query(
      `SELECT process_instance_id,
              parent_step_id,
              status,
              subject_type,
              subject_id
         FROM process_instances
        WHERE parent_instance_id = ?
        ORDER BY process_instance_id ASC`,
      [processInstanceId],
    );

    return rows.map((row: Record<string, unknown>) => ({
      processInstanceId: Number(row.process_instance_id),
      parentStepInstanceId: Number(row.parent_step_id),
      status: String(row.status),
      subjectType: String(row.subject_type),
      subjectId: Number(row.subject_id),
    }));
  }

  private mapStep(
    step: StepRow,
    requirements: ProcessRunnerStepRequirement[],
    triggers: ProcessRunnerStepTrigger[],
    objectBindings: ProcessRunnerStepObjectBinding[],
    childProcessInstanceId?: number,
  ): ProcessRunnerStep {
    const mapped: ProcessRunnerStep = {
      stepInstanceId: step.step_instance_id,
      stepOrder: step.step_order,
      name: step.name ?? `Step ${step.step_order}`,
      stepType: step.task_type,
      status: step.status,
      isOptional: Boolean(step.is_optional),
      blockedReason: step.blocked_reason,
      requirements,
      triggers,
      objectBindings,
    };

    if (childProcessInstanceId) {
      mapped.childProcessInstanceId = childProcessInstanceId;
    }

    return mapped;
  }
}

function groupBy<T extends { stepInstanceId: number }>(
  items: T[],
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const list = map.get(item.stepInstanceId) ?? [];
    list.push(item);
    map.set(item.stepInstanceId, list);
  }
  return map;
}

function stripStepIdFromRequirement(
  row: ProcessRunnerStepRequirement & { stepInstanceId?: number },
): ProcessRunnerStepRequirement {
  const { stepInstanceId: _omit, ...rest } = row as ProcessRunnerStepRequirement & {
    stepInstanceId?: number;
  };
  return rest;
}

function stripStepIdFromTrigger(
  row: ProcessRunnerStepTrigger & { stepInstanceId?: number },
): ProcessRunnerStepTrigger {
  const { stepInstanceId: _omit, ...rest } = row as ProcessRunnerStepTrigger & {
    stepInstanceId?: number;
  };
  return rest;
}

function parseJsonColumn(value: unknown): Record<string, unknown> {
  if (value == null) {
    return {};
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function resolveCurrentStepInstanceId(
  steps: ProcessRunnerStep[],
): number | null {
  const active = steps.find((s) =>
    ['ready', 'in_progress', 'blocked'].includes(s.status),
  );
  if (active) {
    return active.stepInstanceId;
  }

  const pending = steps.find((s) => s.status === 'pending');
  if (pending) {
    return pending.stepInstanceId;
  }

  return null;
}
