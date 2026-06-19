// ──────────────────────────────────────────────────────────────────────────────
// Independent class: ProcessInstantiationService (safer TX + clean copies)
// ──────────────────────────────────────────────────────────────────────────────
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { DataSource, EntityManager } from 'typeorm';
import { PROCESS_TEMPLATE_NOT_PUBLISHED_MESSAGE } from '../common/constants';
import { PROCESS_SUBJECT_TYPE_WORKFLOW } from './process-subject.constants';
import type {
  ProcessInstanceSubjectInput,
  ProcessInstantiationOptions,
} from './process-subject.types';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import { ProcessStepAssigneeService } from './process-step-assignee.service';

@Injectable()
export class ProcessInstantiationService {
  constructor(
    private readonly ds: DataSource,
    private readonly processFlags: ProcessFeatureFlagsService,
    private readonly stepAssignees: ProcessStepAssigneeService,
  ) {}

  // Retry wrapper for transient InnoDB issues (deadlocks/lock waits)
  private async withTxRetry<T>(
    fn: (em: EntityManager) => Promise<T>,
    attempts = 4,
  ): Promise<T> {
    let lastErr: any;
    for (let i = 1; i <= attempts; i++) {
      try {
        return await this.ds.transaction('READ COMMITTED', fn);
      } catch (err: any) {
        const code = err?.code || err?.errno;
        if ((code === 1205 || code === 1213) && i < attempts) {
          // lock wait timeout / deadlock
          await new Promise((r) => setTimeout(r, 50 * i)); // small backoff
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  /**
   * Standalone entry — runs in its own READ COMMITTED transaction with retry/backoff.
   * If you need to compose with a caller's transaction, use `instantiateProcessIn`.
   */
  async instantiateProcess(
    templateId: number,
    tenantId: number,
    createdBy: number,
    subjectOrOptions?: ProcessInstanceSubjectInput | ProcessInstantiationOptions,
  ): Promise<number> {
    const options = normalizeInstantiationOptions(subjectOrOptions);
    return await this.withTxRetry(async (em) =>
      this.instantiateProcessIn(em, templateId, tenantId, createdBy, options),
    );
  }

  /**
   * Composable variant that uses the provided EntityManager (no new transaction).
   * Optimized to reduce lock contention: fewer round-trips, deterministic order, bulk inserts.
   */
  async instantiateProcessIn(
    em: EntityManager,
    templateId: number,
    tenantId: number,
    createdBy: number,
    subjectOrOptions?: ProcessInstanceSubjectInput | ProcessInstantiationOptions,
  ): Promise<number> {
    const options = normalizeInstantiationOptions(subjectOrOptions);
    const subject = options.subject;
    const subjectType = subject?.subjectType ?? PROCESS_SUBJECT_TYPE_WORKFLOW;
    const subjectId = subject?.subjectId ?? 0;
    const subjectMetadata =
      subject?.subjectMetadata !== undefined
        ? JSON.stringify(subject.subjectMetadata)
        : null;
    const contextJson =
      options.context !== undefined && options.context !== null
        ? JSON.stringify(options.context)
        : null;

    const templateRows: Array<{ status: string }> = await em.query(
      `SELECT status
         FROM process_templates
        WHERE process_template_id = ?
          AND (tenant_id = ? OR tenant_id = 0)
        LIMIT 1`,
      [templateId, tenantId],
    );
    if (!templateRows.length || templateRows[0].status !== 'PUBLISHED') {
      throw new RpcException(PROCESS_TEMPLATE_NOT_PUBLISHED_MESSAGE);
    }

    // 1) Create process instance (subject required after migration 1710000000015)
    const res: any = await em.query(
      `INSERT INTO process_instances (
         process_template_id, tenant_id, status, created_by, started_at,
         subject_type, subject_id, subject_metadata,
         parent_instance_id, parent_step_id, on_child_failure, context
       )
       VALUES (?, ?, 'active', ?, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
      [
        templateId,
        tenantId,
        createdBy,
        subjectType,
        subjectId,
        subjectMetadata,
        options.parentInstanceId ?? null,
        options.parentStepId ?? null,
        options.onChildFailure ?? 'pause_parent',
        contextJson,
      ],
    );
    const processInstanceId: number = Number(
      res?.insertId ?? res?.[0]?.insertId,
    );

    const needsSelfSubject =
      !subject ||
      (subjectType === PROCESS_SUBJECT_TYPE_WORKFLOW && subjectId === 0);

    if (needsSelfSubject) {
      await em.query(
        `UPDATE process_instances
            SET subject_id = ?
          WHERE process_instance_id = ?`,
        [processInstanceId, processInstanceId],
      );
    }

    // 2) Fetch template steps + name via correlated subquery (ordered for consistent lock order)
    const steps: Array<{
      process_template_step_id: number;
      step_order: number;
      task_type: string | null;
      is_optional: 0 | 1 | null;
      required_permissions: string[] | null;
      step_extensions_json: Record<string, unknown> | string | null;
      assignee_spec: Record<string, unknown> | string | null;
      name: string | null;
    }> = await em.query(
      `SELECT pts.process_template_step_id,
              pts.step_order,
              pts.task_type,
              pts.is_optional,
              pts.required_permissions,
              pts.step_extensions_json,
              pts.assignee_spec,
              (SELECT d.name
                 FROM process_template_step_descriptions d
                WHERE d.process_template_step_id = pts.process_template_step_id
                ORDER BY d.process_template_step_description_id ASC
                LIMIT 1) AS name
         FROM process_template_steps pts
        WHERE pts.process_template_id = ?
        ORDER BY pts.step_order ASC`,
      [templateId],
    );

    // 3) Insert instance steps (one by one to obtain ids, still O(n) but minimal work per row)
    const stepInstanceIds: number[] = [];
    for (const s of steps) {
      const isFirst = s.step_order === 1;
      const status = isFirst ? 'ready' : 'pending';
      const parallelGroupId = resolveParallelGroupIdFromExtensions(
        s.step_extensions_json,
      );
      const insert: any = await em.query(
        `INSERT INTO process_instance_steps
           (process_instance_id, process_template_step_id, name, task_type, step_order, is_optional, required_permissions, step_extensions_json, assignee_spec, parallel_group_id, status, blocked_reason, ready_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ${isFirst ? 'NOW()' : 'NULL'}, NOW(), NOW())`,
        [
          processInstanceId,
          s.process_template_step_id,
          s.name ?? `Step ${s.step_order}`,
          s.task_type ?? null,
          s.step_order,
          s.is_optional ?? 0,
          s.required_permissions != null
            ? JSON.stringify(s.required_permissions)
            : null,
          serializeStepExtensionsJsonForCopy(s.step_extensions_json),
          serializeAssigneeSpecForCopy(s.assignee_spec),
          parallelGroupId,
          status,
        ],
      );
      stepInstanceIds.push(Number(insert?.insertId ?? insert?.[0]?.insertId));
    }

    // Map: template step id -> instance step id
    const tplToInst = new Map<number, number>();
    steps.forEach((s, i) =>
      tplToInst.set(s.process_template_step_id, stepInstanceIds[i]),
    );

    // 4) Bulk copy requirements (single INSERT ... VALUES (...),(...))
    if (steps.length) {
      const tplIds = steps.map((s) => s.process_template_step_id);
      const reqs: Array<any> = await em.query(
        `SELECT process_template_step_requirement_id,
                process_template_step_id,
                requirement_type,
                requirement_key,
                json_schema
           FROM process_template_step_requirements
          WHERE process_template_step_id IN (${tplIds.map(() => '?').join(',')})`,
        tplIds,
      );

      if (reqs.length) {
        const placeholders: string[] = [];
        const values: any[] = [];
        for (const r of reqs) {
          const stepInstanceId = tplToInst.get(r.process_template_step_id);
          if (!stepInstanceId) continue;
          placeholders.push('(?, ?, ?, ?, ?, ?, "none")');
          values.push(
            stepInstanceId,
            r.process_template_step_requirement_id,
            r.requirement_type,
            r.requirement_key,
            JSON.stringify(r.json_schema ?? {}),
            1,
          );
        }
        if (placeholders.length) {
          await em.query(
            `INSERT INTO process_instance_step_requirements
               (step_instance_id, process_template_step_requirement_id, requirement_type, requirement_key, json_schema, is_mandatory, status)
             VALUES ${placeholders.join(',')}`,
            values,
          );
        }
      }

      // 5) Bulk copy triggers
      const trigs: Array<any> = await em.query(
        `SELECT step_trigger_condition_id,
                process_template_step_id,
                condition_type,
                condition_key,
                json_schema
           FROM process_template_step_trigger_conditions
          WHERE process_template_step_id IN (${tplIds.map(() => '?').join(',')})`,
        tplIds,
      );

      if (trigs.length) {
        const placeholders: string[] = [];
        const values: any[] = [];
        for (const t of trigs) {
          const stepInstanceId = tplToInst.get(t.process_template_step_id);
          if (!stepInstanceId) continue;
          placeholders.push('(?, ?, ?, ?, ?, "unmet")');
          values.push(
            stepInstanceId,
            t.step_trigger_condition_id,
            t.condition_type,
            t.condition_key,
            JSON.stringify(t.json_schema ?? {}),
          );
        }
        if (placeholders.length) {
          await em.query(
            `INSERT INTO process_instance_step_triggers
               (step_instance_id, process_template_step_trigger_condition_id, condition_type, condition_key, json_schema, status)
             VALUES ${placeholders.join(',')}`,
            values,
          );
        }
      }

      // 6) Bulk copy template object bindings → instance rows (pending)
      const bindings: Array<{
        binding_id: number;
        process_template_step_id: number;
        config_object_id: number;
      }> = await em.query(
        `SELECT binding_id, process_template_step_id, config_object_id
           FROM process_template_step_object_bindings
          WHERE process_template_step_id IN (${tplIds.map(() => '?').join(',')})
          ORDER BY order_index ASC, binding_id ASC`,
        tplIds,
      );

      if (bindings.length) {
        const bindingPlaceholders: string[] = [];
        const bindingValues: unknown[] = [];
        for (const b of bindings) {
          const stepInstanceId = tplToInst.get(b.process_template_step_id);
          if (!stepInstanceId) continue;
          bindingPlaceholders.push('(?, ?, ?, ?, "pending")');
          bindingValues.push(
            stepInstanceId,
            b.binding_id,
            b.config_object_id,
            null,
          );
        }
        if (bindingPlaceholders.length) {
          await em.query(
            `INSERT INTO process_instance_step_object_instances
               (step_instance_id, binding_id, config_object_id, config_custom_object_instance_id, status)
             VALUES ${bindingPlaceholders.join(',')}`,
            bindingValues,
          );
        }
      }

      // 7) Bulk copy template step actions → instance rows (snapshot config)
      const stepActions: Array<{
        step_action_id: number;
        process_template_step_id: number;
        action_type: string;
        run_on: string;
        config: Record<string, unknown> | string;
        order_index: number;
        is_active: number;
      }> = await em.query(
        `SELECT step_action_id,
                process_template_step_id,
                action_type,
                run_on,
                config,
                order_index,
                is_active
           FROM process_template_step_actions
          WHERE process_template_step_id IN (${tplIds.map(() => '?').join(',')})
            AND is_active = 1
          ORDER BY order_index ASC, step_action_id ASC`,
        tplIds,
      );

      if (stepActions.length) {
        const actionPlaceholders: string[] = [];
        const actionValues: unknown[] = [];
        for (const action of stepActions) {
          const stepInstanceId = tplToInst.get(action.process_template_step_id);
          if (!stepInstanceId) continue;
          actionPlaceholders.push('(?, ?, ?, ?, ?, ?, ?)');
          actionValues.push(
            stepInstanceId,
            action.step_action_id,
            action.action_type,
            action.run_on,
            JSON.stringify(action.config ?? {}),
            action.order_index ?? 0,
            action.is_active ?? 1,
          );
        }
        if (actionPlaceholders.length) {
          await em.query(
            `INSERT INTO process_instance_step_actions
               (step_instance_id, template_step_action_id, action_type, run_on, config, order_index, is_active)
             VALUES ${actionPlaceholders.join(',')}`,
            actionValues,
          );
        }
      }

      const templateAssignees: Array<{
        process_template_step_id: number;
        tenant_user_id: number;
        assignment_order: number;
      }> = this.processFlags.isStepAssigneeSpecEnabled()
        ? []
        : await em.query(
            `SELECT process_template_step_id,
                    tenant_user_id,
                    assignment_order
               FROM process_template_step_assignees
              WHERE process_template_step_id IN (${tplIds.map(() => '?').join(',')})
              ORDER BY assignment_order ASC, step_assignee_id ASC`,
            tplIds,
          );

      if (templateAssignees.length) {
        const assigneePlaceholders: string[] = [];
        const assigneeValues: unknown[] = [];
        for (const assignee of templateAssignees) {
          const stepInstanceId = tplToInst.get(assignee.process_template_step_id);
          if (!stepInstanceId) continue;
          assigneePlaceholders.push('(?, ?, ?)');
          assigneeValues.push(
            stepInstanceId,
            assignee.tenant_user_id,
            assignee.assignment_order ?? 0,
          );
        }
        if (assigneePlaceholders.length) {
          await em.query(
            `INSERT INTO process_instance_step_assignees
               (step_instance_id, tenant_user_id, assignment_order)
             VALUES ${assigneePlaceholders.join(',')}`,
            assigneeValues,
          );
        }
      }
    }

    if (this.processFlags.isStepAssigneeSpecEnabled() && stepInstanceIds.length) {
      await this.stepAssignees.resolveAndPersistForStep(
        {
          stepInstanceId: stepInstanceIds[0],
          tenantId,
          actorTenantUserId: createdBy,
        },
        em,
      );
    }

    return processInstanceId;
  }
}

function normalizeInstantiationOptions(
  input?: ProcessInstanceSubjectInput | ProcessInstantiationOptions,
): ProcessInstantiationOptions {
  if (!input) {
    return {};
  }
  if ('subjectType' in input) {
    return { subject: input };
  }
  return input;
}

function serializeAssigneeSpecForCopy(
  raw: Record<string, unknown> | string | null | undefined,
): string | null {
  return serializeStepExtensionsJsonForCopy(raw);
}

/** Snapshot template `step_extensions_json` for instance row (plain object only). */
function serializeStepExtensionsJsonForCopy(
  raw: Record<string, unknown> | string | null | undefined,
): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return JSON.stringify(raw);
  }
  return null;
}

function resolveParallelGroupIdFromExtensions(
  raw: Record<string, unknown> | string | null | undefined,
): string | null {
  if (raw == null) {
    return null;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const value = (raw as Record<string, unknown>).parallelGroupId;
    if (value == null) {
      return null;
    }
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed.slice(0, 64) : null;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const value = parsed.parallelGroupId;
      if (typeof value !== 'string') {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length ? trimmed.slice(0, 64) : null;
    } catch {
      return null;
    }
  }
  return null;
}
