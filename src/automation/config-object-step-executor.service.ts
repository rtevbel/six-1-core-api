import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { ConfigObjectsService } from '../config_objects/config_objects.service';
import { ConfigObjectCompletenessService } from '../config_objects/config-object-completeness.service';
import { EventsService } from '../events/events.service';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import {
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_ACTIVE,
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_FAILED,
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING,
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_VALID,
  PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER,
  PROCESS_TEMPLATE_OBJECT_BINDING_MODE_USE_EXISTING,
} from './process-step-object-binding.constants';
import type { ConfigObjectResolutionMode } from '../config_objects/config-object-completeness-fields.util';
import {
  isCoreLinkedConfigBindingMode,
  resolveCoreIdForObjectType,
  type ProcessStepAnchorContext,
} from './process-step-core-ref.util';

export type StepObjectBindingRow = {
  step_object_instance_id: number;
  step_instance_id: number;
  binding_id: number | null;
  config_object_id: number;
  config_custom_object_instance_id: number | null;
  core_id: number | null;
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
  subject_type: string;
  subject_id: number;
  subject_metadata: unknown;
  context: unknown;
};

@Injectable()
export class ConfigObjectStepExecutor {
  private readonly logger = new Logger(ConfigObjectStepExecutor.name);

  constructor(
    private readonly ds: DataSource,
    private readonly events: EventsService,
    private readonly flags: ProcessFeatureFlagsService,
    private readonly configObjectsService: ConfigObjectsService,
    private readonly completenessService: ConfigObjectCompletenessService,
  ) {}

  isEnabled(): boolean {
    return this.flags.isConfigObjectStepsEnabled();
  }

  async areMandatoryBindingsValid(
    em: EntityManager,
    stepInstanceId: number,
  ): Promise<boolean> {
    if (!this.isEnabled()) {
      return true;
    }

    await this.revalidateBindingsForStep(em, stepInstanceId);

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

  /**
   * Re-evaluates active/failed bindings before step completion gates.
   * Covers cases where SoR saves succeeded but domain events were not emitted
   * (e.g. global-scope customer with tenantId 0).
   */
  async revalidateBindingsForStep(
    em: EntityManager,
    stepInstanceId: number,
  ): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const links: Array<{
      core_id: number | null;
      config_custom_object_instance_id: number | null;
      object_type: string | null;
      tenant_id: number | null;
    }> = await em.query(
      `SELECT oi.core_id,
              oi.config_custom_object_instance_id,
              co.object_type,
              pi.tenant_id
         FROM process_instance_step_object_instances oi
         JOIN process_instance_steps s ON s.step_instance_id = oi.step_instance_id
         JOIN process_instances pi ON pi.process_instance_id = s.process_instance_id
         JOIN config_objects co ON co.config_object_id = oi.config_object_id
        WHERE oi.step_instance_id = ?
          AND oi.status IN ('active', 'failed')`,
      [stepInstanceId],
    );

    for (const link of links) {
      const coreId =
        link.core_id != null ? Number(link.core_id) : null;
      const instanceId =
        link.config_custom_object_instance_id != null
          ? Number(link.config_custom_object_instance_id)
          : null;

      if (coreId) {
        await this.validateByCoreLink(
          Number(link.tenant_id ?? 0),
          String(link.object_type ?? ''),
          coreId,
        );
      } else if (instanceId) {
        await this.validateByCustomInstanceId(instanceId, 0);
      }
    }
  }

  /**
   * Marks non-terminal object bindings as skipped when a step is manually skipped (F4).
   */
  async skipBindingsForStep(
    em: EntityManager,
    stepInstanceId: number,
  ): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    await em.query(
      `UPDATE process_instance_step_object_instances
          SET status = 'skipped',
              updated_at = NOW()
        WHERE step_instance_id = ?
          AND status NOT IN ('valid', 'skipped')`,
      [stepInstanceId],
    );
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
   * Provisions pending bindings when a step becomes ready (standalone + core-linked).
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

    const anchor = this.toAnchorContext(ctx);
    const rows = await this.loadBindingRows(em, params.stepInstanceId);
    for (const row of rows) {
      if (this.isDeferredSorBoundCreateOnEnter(row) && row.status === 'failed') {
        await em.query(
          `UPDATE process_instance_step_object_instances
              SET status = ?,
                  last_error = NULL,
                  updated_at = NOW()
            WHERE step_object_instance_id = ?`,
          [
            PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING,
            row.step_object_instance_id,
          ],
        );
        row.status = PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING;
      }
    }
    const toProvision = rows.filter((row) =>
      this.isBindingEligibleForProvisioning(row),
    );

    if (!toProvision.length) {
      return;
    }

    for (const row of toProvision) {
      const templateBindingMode =
        row.binding_mode ?? PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER;
      const configBindingMode = row.config_binding_mode ?? 'standalone';

      if (isCoreLinkedConfigBindingMode(configBindingMode)) {
        await this.provisionCoreLinkedBinding(
          em,
          anchor,
          ctx,
          row,
          templateBindingMode,
          params,
        );
        continue;
      }

      if (templateBindingMode === PROCESS_TEMPLATE_OBJECT_BINDING_MODE_USE_EXISTING) {
        await this.failBindingRow(
          em,
          row.step_object_instance_id,
          'use_existing is only supported for sor_bound and system_table config objects',
        );
        continue;
      }

      if (configBindingMode !== 'standalone') {
        await this.failBindingRow(
          em,
          row.step_object_instance_id,
          `Unsupported config object binding mode: ${configBindingMode}`,
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

        this.emitObjectCreated(params.stepInstanceId, ctx, row, {
          configCustomObjectInstanceId: instanceId,
          correlationId: params.correlationId,
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to provision config object';
        this.logger.warn(
          `Provision failed for step_object_instance_id=${row.step_object_instance_id}: ${message}`,
        );
        await this.failBindingRow(em, row.step_object_instance_id, message);
      }
    }
  }

  async validateByCustomInstanceId(
    configCustomObjectInstanceId: number,
    _updatedBy: number,
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

      const completionRule = this.parseCompletionRule(link.completion_rule);
      const evaluation = await this.completenessService.isBindingComplete({
        tenantId: Number(link.tenant_id),
        objectType: String(link.object_type ?? ''),
        resolutionMode: 'standalone',
        completionRule,
        instanceId: configCustomObjectInstanceId,
        snapshot: {
          fields: (instance.payload ?? {}) as Record<string, unknown>,
          status: String(instance.status),
        },
      });

      return this.finalizeBindingValidation(
        em,
        link,
        evaluation,
        evaluation.valid ? JSON.stringify(instance.payload ?? {}) : null,
        {
          configCustomObjectInstanceId,
          correlationId,
        },
      );
    });
  }

  /**
   * Re-validates active core-linked bindings after SoR / system_table updates.
   */
  async validateByCoreLink(
    tenantId: number,
    objectType: string,
    coreId: number,
    correlationId?: string,
  ): Promise<{ stepInstanceIds: number[]; anyValid: boolean }> {
    if (!this.isEnabled()) {
      return { stepInstanceIds: [], anyValid: false };
    }

    const stepInstanceIds: number[] = [];
    let anyValid = false;

    await this.ds.transaction(async (em) => {
      const links = await em.query(
        `SELECT oi.step_object_instance_id,
                oi.step_instance_id,
                oi.config_object_id,
                oi.binding_id,
                oi.core_id,
                b.completion_rule,
                co.object_type,
                co.binding_mode AS config_binding_mode,
                pi.tenant_id,
                pi.process_instance_id
           FROM process_instance_step_object_instances oi
           JOIN process_instance_steps s ON s.step_instance_id = oi.step_instance_id
           JOIN process_instances pi ON pi.process_instance_id = s.process_instance_id
           JOIN config_objects co ON co.config_object_id = oi.config_object_id
           LEFT JOIN process_template_step_object_bindings b
             ON b.binding_id = oi.binding_id
          WHERE oi.core_id = ?
            AND co.object_type = ?
            AND oi.status IN ('active', 'failed')
          FOR UPDATE`,
        [coreId, objectType],
      );

      if (!links?.length) {
        return;
      }

      for (const link of links) {
        const linkTenantId = Number(link.tenant_id ?? tenantId ?? 0);
        const resolutionMode = this.normalizeResolutionMode(
          link.config_binding_mode,
        );
        const completionRule = this.parseCompletionRule(link.completion_rule);
        const evaluation = await this.completenessService.isBindingComplete({
          tenantId: linkTenantId,
          objectType,
          resolutionMode,
          completionRule,
          coreId,
        });

        const fields = evaluation.valid
          ? (
              await this.completenessService.buildFieldSnapshot({
                tenantId: linkTenantId,
                objectType,
                resolutionMode,
                coreId,
              })
            )?.fields ?? {}
          : {};

        const result = await this.finalizeBindingValidation(
          em,
          link,
          evaluation,
          evaluation.valid ? JSON.stringify(fields) : null,
          {
            coreId,
            objectType,
            correlationId,
          },
        );

        if (result.stepInstanceId) {
          stepInstanceIds.push(result.stepInstanceId);
        }
        if (result.valid) {
          anyValid = true;
        }
      }
    });

    return {
      stepInstanceIds: Array.from(new Set(stepInstanceIds)),
      anyValid,
    };
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

  private async provisionCoreLinkedBinding(
    em: EntityManager,
    anchor: ProcessStepAnchorContext,
    ctx: ProcessContextRow,
    row: StepObjectBindingRow,
    templateBindingMode: string,
    params: { stepInstanceId: number; correlationId?: string },
  ): Promise<void> {
    const objectType = String(row.object_type ?? '');
    let coreId = resolveCoreIdForObjectType(anchor, objectType);

    if (!coreId && this.isDeferredSorBoundCreateOnEnter(row)) {
      this.logger.debug(
        `Deferring sor_bound provisioning until first save for step_object_instance_id=${row.step_object_instance_id} objectType=${objectType}`,
      );
      return;
    }

    if (
      !coreId &&
      templateBindingMode === PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER
    ) {
      await this.failBindingRow(
        em,
        row.step_object_instance_id,
        `Could not resolve coreId for objectType=${objectType}`,
      );
      return;
    }

    if (!coreId) {
      await this.failBindingRow(
        em,
        row.step_object_instance_id,
        `Could not resolve coreId for objectType=${objectType}`,
      );
      return;
    }

    try {
      const resolutionMode = this.normalizeResolutionMode(row.config_binding_mode);
      const coreRecord = await this.configObjectsService.loadCoreRecord(
        objectType,
        coreId,
      );
      if (!coreRecord) {
        throw new Error(`Could not resolve ${objectType}#${coreId}`);
      }

      if (resolutionMode === 'sor_bound') {
        const resolved = await this.configObjectsService.resolveObjectInstance(
          ctx.tenant_id,
          objectType,
          coreId,
        );
        if (!resolved) {
          throw new Error(`Could not resolve ${objectType}#${coreId}`);
        }
      }

      await em.query(
        `UPDATE process_instance_step_object_instances
            SET core_id = ?,
                status = ?,
                last_error = NULL,
                updated_at = NOW()
          WHERE step_object_instance_id = ?`,
        [
          coreId,
          PROCESS_INSTANCE_STEP_OBJECT_STATUS_ACTIVE,
          row.step_object_instance_id,
        ],
      );

      this.emitObjectCreated(params.stepInstanceId, ctx, row, {
        coreId,
        objectType,
        resolutionMode: row.config_binding_mode,
        bindingMode: templateBindingMode,
        correlationId: params.correlationId,
      });

      if (templateBindingMode === PROCESS_TEMPLATE_OBJECT_BINDING_MODE_USE_EXISTING) {
        const completionRule = this.parseCompletionRule(row.completion_rule);
        const evaluation = await this.completenessService.isBindingComplete({
          tenantId: ctx.tenant_id,
          objectType,
          resolutionMode,
          completionRule,
          coreId,
        });
        if (evaluation.valid) {
          const snapshot = await this.completenessService.buildFieldSnapshot({
            tenantId: ctx.tenant_id,
            objectType,
            resolutionMode,
            coreId,
          });
          const fields = snapshot?.fields ?? {};
          await em.query(
            `UPDATE process_instance_step_object_instances
                SET status = ?,
                    payload_snapshot = ?,
                    last_error = NULL,
                    updated_at = NOW()
              WHERE step_object_instance_id = ?`,
            [
              PROCESS_INSTANCE_STEP_OBJECT_STATUS_VALID,
              JSON.stringify(fields),
              row.step_object_instance_id,
            ],
          );
          this.events.emit('six1-event.process_step_object_validated', {
            entity: {
              entityType: 'ProcessStepObjectInstance',
              entityId: row.step_object_instance_id,
            },
            data: {
              stepInstanceId: params.stepInstanceId,
              processInstanceId: ctx.process_instance_id,
              stepObjectInstanceId: row.step_object_instance_id,
              configObjectId: row.config_object_id,
              objectType,
              coreId,
              resolutionMode: row.config_binding_mode,
            },
            correlationId: params.correlationId,
          });
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to link core object';
      await this.failBindingRow(em, row.step_object_instance_id, message);
    }
  }

  private async finalizeBindingValidation(
    em: EntityManager,
    link: Record<string, unknown>,
    evaluation: { valid: boolean; error?: string },
    payloadSnapshot: string | null,
    emitData: Record<string, unknown>,
  ): Promise<{ stepInstanceId: number | null; valid: boolean }> {
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
        payloadSnapshot,
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
          configObjectId: link.config_object_id,
          objectType: link.object_type,
          ...emitData,
        },
        correlationId: emitData.correlationId as string | undefined,
      });
    }

    return {
      stepInstanceId: Number(link.step_instance_id),
      valid: evaluation.valid,
    };
  }

  private emitObjectCreated(
    stepInstanceId: number,
    ctx: ProcessContextRow,
    row: StepObjectBindingRow,
    data: Record<string, unknown>,
  ): void {
    this.events.emit('six1-event.process_step_object_created', {
      entity: {
        entityType: 'ProcessStepObjectInstance',
        entityId: row.step_object_instance_id,
      },
      data: {
        stepInstanceId,
        processInstanceId: ctx.process_instance_id,
        stepObjectInstanceId: row.step_object_instance_id,
        configObjectId: row.config_object_id,
        ...data,
      },
      correlationId: data.correlationId as string | undefined,
    });
  }

  private isDeferredSorBoundCreateOnEnter(row: StepObjectBindingRow): boolean {
    const templateBindingMode =
      row.binding_mode ?? PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER;
    const configBindingMode = row.config_binding_mode ?? 'standalone';
    return (
      templateBindingMode === PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER &&
      configBindingMode === 'sor_bound' &&
      row.core_id == null
    );
  }

  /**
   * Pending bindings are provisioned on first step ready (standalone / use_existing core).
   * Deferred sor_bound create_on_enter bindings are excluded until first save.
   */
  private isBindingEligibleForProvisioning(row: StepObjectBindingRow): boolean {
    if (row.status === PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING) {
      if (this.isDeferredSorBoundCreateOnEnter(row)) {
        return false;
      }
      return true;
    }

    if (row.status !== PROCESS_INSTANCE_STEP_OBJECT_STATUS_FAILED) {
      return false;
    }

    const templateBindingMode =
      row.binding_mode ?? PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER;
    if (templateBindingMode !== PROCESS_TEMPLATE_OBJECT_BINDING_MODE_CREATE_ON_ENTER) {
      return false;
    }

    const configBindingMode = row.config_binding_mode ?? 'standalone';
    if (configBindingMode === 'sor_bound') {
      return false;
    }

    if (isCoreLinkedConfigBindingMode(configBindingMode)) {
      return row.core_id == null;
    }

    return row.config_custom_object_instance_id == null;
  }

  private async failBindingRow(
    em: EntityManager,
    stepObjectInstanceId: number,
    message: string,
  ): Promise<void> {
    await em.query(
      `UPDATE process_instance_step_object_instances
          SET status = ?, last_error = ?, updated_at = NOW()
        WHERE step_object_instance_id = ?`,
      [
        PROCESS_INSTANCE_STEP_OBJECT_STATUS_FAILED,
        message.slice(0, 2000),
        stepObjectInstanceId,
      ],
    );
  }

  private normalizeResolutionMode(
    bindingMode: string | null | undefined,
  ): ConfigObjectResolutionMode {
    if (bindingMode === 'system_table') {
      return 'system_table';
    }
    if (bindingMode === 'sor_bound') {
      return 'sor_bound';
    }
    return 'standalone';
  }

  private parseCompletionRule(
    raw: Record<string, unknown> | string | null,
  ): Record<string, unknown> | null {
    if (!raw) {
      return null;
    }
    if (typeof raw === 'string') {
      return JSON.parse(raw) as Record<string, unknown>;
    }
    return raw;
  }

  private toAnchorContext(ctx: ProcessContextRow): ProcessStepAnchorContext {
    return {
      subjectType: String(ctx.subject_type ?? ''),
      subjectId: Number(ctx.subject_id ?? 0),
      subjectMetadata: this.parseJsonRecord(ctx.subject_metadata),
      context: this.parseJsonRecord(ctx.context),
    };
  }

  private parseJsonRecord(value: unknown): Record<string, unknown> | null {
    if (!value) {
      return null;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
    return null;
  }

  private async loadProcessContext(
    em: EntityManager,
    stepInstanceId: number,
  ): Promise<ProcessContextRow | null> {
    const [row] = await em.query(
      `SELECT pi.tenant_id,
              pi.created_by,
              pi.process_instance_id,
              pi.subject_type,
              pi.subject_id,
              pi.subject_metadata,
              pi.context
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
              oi.core_id,
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
