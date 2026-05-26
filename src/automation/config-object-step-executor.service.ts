import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { EventsService } from '../events/events.service';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import {
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_ACTIVE,
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_FAILED,
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING,
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_VALID,
  PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER,
} from './process-step-object-binding.constants';
import { evaluateCompletionRule } from './completion-rule.util';

export type StepObjectBindingRow = {
  step_object_instance_id: number;
  step_instance_id: number;
  binding_id: number | null;
  config_object_id: number;
  config_custom_object_instance_id: number | null;
  status: string;
  binding_mode: string | null;
  is_mandatory: number | null;
  completion_rule: Record<string, unknown> | string | null;
  object_type: string | null;
  config_binding_mode: string | null;
};

type ProcessContextRow = {
  tenant_id: number;
  created_by: number;
  process_instance_id: number;
};

@Injectable()
export class ConfigObjectStepExecutor {
  private readonly logger = new Logger(ConfigObjectStepExecutor.name);

  constructor(
    private readonly ds: DataSource,
    private readonly events: EventsService,
    private readonly flags: ProcessFeatureFlagsService,
  ) {}

  isEnabled(): boolean {
    return this.flags.isConfigObjectStepsEnabled();
  }

  /**
   * Returns true when all mandatory object bindings for the step are `valid` or `skipped`.
   * Option B gating — orchestrator calls this alongside requirement checks.
   */
  async areMandatoryBindingsValid(
    em: EntityManager,
    stepInstanceId: number,
  ): Promise<boolean> {
    if (!this.isEnabled()) {
      return true;
    }

    const rows: Array<{ blocking: number }> = await em.query(
      `SELECT COUNT(*) AS blocking
         FROM process_instance_step_object_instances oi
         LEFT JOIN process_template_step_object_bindings b
           ON b.binding_id = oi.binding_id
        WHERE oi.step_instance_id = ?
          AND COALESCE(b.is_mandatory, 1) = 1
          AND oi.status NOT IN ('valid', 'skipped')`,
      [stepInstanceId],
    );

    return Number(rows[0]?.blocking ?? 0) === 0;
  }

  async stepHasObjectBindings(
    em: EntityManager,
    stepInstanceId: number,
  ): Promise<boolean> {
    const rows: Array<{ cnt: number }> = await em.query(
      `SELECT COUNT(*) AS cnt
         FROM process_instance_step_object_instances
        WHERE step_instance_id = ?`,
      [stepInstanceId],
    );
    return Number(rows[0]?.cnt ?? 0) > 0;
  }

  /**
   * Creates standalone instances for pending `create_on_enter` bindings when a step becomes ready.
   */
  async provisionBindingsOnStepReady(
    qr: QueryRunner,
    params: {
      stepInstanceId: number;
      correlationId?: string;
    },
  ): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const em = qr.manager;
    const ctx = await this.loadProcessContext(em, params.stepInstanceId);
    if (!ctx) {
      return;
    }

    const rows = await this.loadBindingRows(em, params.stepInstanceId);
    const pending = rows.filter(
      (r) =>
        r.status === PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING &&
        (r.binding_mode ?? PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER) ===
          PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER,
    );

    if (!pending.length) {
      return;
    }

    for (const row of pending) {
      if (row.config_binding_mode && row.config_binding_mode !== 'standalone') {
        await em.query(
          `UPDATE process_instance_step_object_instances
              SET status = ?, last_error = ?, updated_at = NOW()
            WHERE step_object_instance_id = ?`,
          [
            PROCESS_INSTANCE_STEP_OBJECT_STATUS_FAILED,
            'Only standalone config objects are supported in Phase 5',
            row.step_object_instance_id,
          ],
        );
        continue;
      }

      try {
        const instanceId = await this.createStandaloneInstanceInTransaction(
          em,
          ctx.tenant_id,
          row.config_object_id,
          ctx.created_by,
        );

        await em.query(
          `UPDATE process_instance_step_object_instances
              SET config_custom_object_instance_id = ?,
                  status = ?,
                  last_error = NULL,
                  updated_at = NOW()
            WHERE step_object_instance_id = ?`,
          [
            instanceId,
            PROCESS_INSTANCE_STEP_OBJECT_STATUS_ACTIVE,
            row.step_object_instance_id,
          ],
        );

        this.events.emit('six1-event.process_step_object_created', {
          entity: {
            entityType: 'ProcessStepObjectInstance',
            entityId: row.step_object_instance_id,
          },
          data: {
            stepInstanceId: params.stepInstanceId,
            processInstanceId: ctx.process_instance_id,
            stepObjectInstanceId: row.step_object_instance_id,
            configObjectId: row.config_object_id,
            configCustomObjectInstanceId: instanceId,
          },
          correlationId: params.correlationId,
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to provision config object';
        this.logger.warn(
          `Provision failed for step_object_instance_id=${row.step_object_instance_id}: ${message}`,
        );
        await em.query(
          `UPDATE process_instance_step_object_instances
              SET status = ?, last_error = ?, updated_at = NOW()
            WHERE step_object_instance_id = ?`,
          [
            PROCESS_INSTANCE_STEP_OBJECT_STATUS_FAILED,
            message.slice(0, 2000),
            row.step_object_instance_id,
          ],
        );
      }
    }
  }

  /**
   * Validates payload against completion_rule and marks the binding row valid/failed.
   */
  async validateByCustomInstanceId(
    configCustomObjectInstanceId: number,
    updatedBy: number,
    correlationId?: string,
  ): Promise<{ stepInstanceId: number | null; valid: boolean }> {
    if (!this.isEnabled()) {
      return { stepInstanceId: null, valid: false };
    }

    return this.ds.transaction(async (em) => {
      const [link] = await em.query(
        `SELECT oi.step_object_instance_id,
                oi.step_instance_id,
                oi.config_object_id,
                oi.binding_id,
                oi.status AS link_status,
                b.completion_rule,
                co.object_type,
                pi.tenant_id,
                pi.process_instance_id
           FROM process_instance_step_object_instances oi
           JOIN process_instance_steps s ON s.step_instance_id = oi.step_instance_id
           JOIN process_instances pi ON pi.process_instance_id = s.process_instance_id
           JOIN config_objects co ON co.config_object_id = oi.config_object_id
           LEFT JOIN process_template_step_object_bindings b
             ON b.binding_id = oi.binding_id
          WHERE oi.config_custom_object_instance_id = ?
          LIMIT 1
          FOR UPDATE`,
        [configCustomObjectInstanceId],
      );

      if (!link) {
        return { stepInstanceId: null, valid: false };
      }

      const [instance] = await em.query(
        `SELECT payload, status
           FROM config_custom_object_instances
          WHERE config_custom_object_instance_id = ?
            AND tenant_id = ?
          LIMIT 1`,
        [configCustomObjectInstanceId, link.tenant_id],
      );

      if (!instance) {
        return {
          stepInstanceId: Number(link.step_instance_id),
          valid: false,
        };
      }

      const completionRule =
        typeof link.completion_rule === 'string'
          ? (JSON.parse(link.completion_rule) as Record<string, unknown>)
          : (link.completion_rule as Record<string, unknown> | null);

      const evaluation = evaluateCompletionRule(completionRule, {
        payload: instance.payload ?? {},
        status: instance.status,
      });

      const nextStatus = evaluation.valid
        ? PROCESS_INSTANCE_STEP_OBJECT_STATUS_VALID
        : PROCESS_INSTANCE_STEP_OBJECT_STATUS_FAILED;

      await em.query(
        `UPDATE process_instance_step_object_instances
            SET status = ?,
                last_error = ?,
                payload_snapshot = ?,
                updated_at = NOW()
          WHERE step_object_instance_id = ?`,
        [
          nextStatus,
          evaluation.valid ? null : (evaluation.error ?? 'Validation failed'),
          evaluation.valid ? JSON.stringify(instance.payload ?? {}) : null,
          link.step_object_instance_id,
        ],
      );

      if (evaluation.valid) {
        this.events.emit('six1-event.process_step_object_validated', {
          entity: {
            entityType: 'ProcessStepObjectInstance',
            entityId: link.step_object_instance_id,
          },
          data: {
            stepInstanceId: link.step_instance_id,
            processInstanceId: link.process_instance_id,
            stepObjectInstanceId: link.step_object_instance_id,
            configCustomObjectInstanceId,
            configObjectId: link.config_object_id,
            objectType: link.object_type,
          },
          correlationId,
        });
      }

      return {
        stepInstanceId: Number(link.step_instance_id),
        valid: evaluation.valid,
      };
    });
  }

  async findStepIdForCustomInstance(
    configCustomObjectInstanceId: number,
  ): Promise<number | null> {
    const [row] = await this.ds.query(
      `SELECT step_instance_id
         FROM process_instance_step_object_instances
        WHERE config_custom_object_instance_id = ?
        LIMIT 1`,
      [configCustomObjectInstanceId],
    );
    return row?.step_instance_id != null ? Number(row.step_instance_id) : null;
  }

  private async loadProcessContext(
    em: EntityManager,
    stepInstanceId: number,
  ): Promise<ProcessContextRow | null> {
    const [row] = await em.query(
      `SELECT pi.tenant_id, pi.created_by, pi.process_instance_id
         FROM process_instance_steps s
         JOIN process_instances pi ON pi.process_instance_id = s.process_instance_id
        WHERE s.step_instance_id = ?
        LIMIT 1`,
      [stepInstanceId],
    );
    return row ?? null;
  }

  private async loadBindingRows(
    em: EntityManager,
    stepInstanceId: number,
  ): Promise<StepObjectBindingRow[]> {
    return em.query(
      `SELECT oi.step_object_instance_id,
              oi.step_instance_id,
              oi.binding_id,
              oi.config_object_id,
              oi.config_custom_object_instance_id,
              oi.status,
              b.binding_mode,
              b.is_mandatory,
              b.completion_rule,
              co.object_type,
              co.binding_mode AS config_binding_mode
         FROM process_instance_step_object_instances oi
         LEFT JOIN process_template_step_object_bindings b
           ON b.binding_id = oi.binding_id
         JOIN config_objects co ON co.config_object_id = oi.config_object_id
        WHERE oi.step_instance_id = ?
        ORDER BY b.order_index ASC, oi.step_object_instance_id ASC`,
      [stepInstanceId],
    );
  }

  /**
   * Inserts a DRAFT standalone instance inside the orchestrator transaction.
   */
  private async createStandaloneInstanceInTransaction(
    em: EntityManager,
    tenantId: number,
    configObjectId: number,
    createdBy: number,
  ): Promise<number> {
    const [configObject] = await em.query(
      `SELECT config_object_id, binding_mode
         FROM config_objects
        WHERE config_object_id = ?
        LIMIT 1`,
      [configObjectId],
    );

    if (!configObject) {
      throw new Error('Config object not found');
    }
    if (configObject.binding_mode !== 'standalone') {
      throw new Error('Config object must use standalone binding mode');
    }

    const res: { insertId?: number } = await em.query(
      `INSERT INTO config_custom_object_instances
         (tenant_id, config_object_id, payload, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, 'DRAFT', ?, NOW(), NOW())`,
      [tenantId, configObjectId, JSON.stringify({}), createdBy],
    );

    const instanceId = Number(res?.insertId);
    if (!instanceId) {
      throw new Error('Failed to create config custom object instance');
    }

    return instanceId;
  }
}
