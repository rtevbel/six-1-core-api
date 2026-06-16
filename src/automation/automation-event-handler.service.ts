import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import jsonLogic from 'json-logic-js';
import type { EventEnvelope } from '../events/types';
import { StepOrchestratorService } from './step-orchestrator.service';
import { ConfigObjectStepExecutor } from './config-object-step-executor.service';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import {
  isPlatformEventName,
  PLATFORM_EVENT_NAMES,
} from '../events/constants/platform-event-names.constants';

/**
 * Automation reactions to platform events — shared by legacy listener and P1 bus consumer.
 */
@Injectable()
export class AutomationEventHandlerService {
  private readonly logger = new Logger(AutomationEventHandlerService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly orchestrator: StepOrchestratorService,
    private readonly configObjectExecutor: ConfigObjectStepExecutor,
    private readonly flags: ProcessFeatureFlagsService,
  ) {}

  canHandle(envelope: EventEnvelope): boolean {
    return isPlatformEventName(envelope.eventName);
  }

  async handle(envelope: EventEnvelope): Promise<void> {
    const eventName = envelope.eventName;

    if (eventName === 'six1-event.process_child_completed') {
      await this.onProcessChildCompleted(envelope);
    }

    if (eventName === 'six1-event.process_step_object_validated') {
      await this.onProcessStepObjectValidated(envelope);
    }

    if (eventName === PLATFORM_EVENT_NAMES.CONFIG_OBJECT_INSTANCE_UPDATED) {
      await this.onConfigObjectInstanceUpdated(envelope);
    }

    if (eventName === PLATFORM_EVENT_NAMES.SOR_BOUND_INSTANCE_UPDATED) {
      await this.onSorBoundInstanceUpdated(envelope);
    }

    if (eventName === PLATFORM_EVENT_NAMES.SYSTEM_ENTITY_UPDATED) {
      await this.onSystemEntityUpdated(envelope);
    }

    if (eventName.startsWith('six1-event.requirement.')) {
      await this.onRequirementEvent(envelope);
    }

    if (isPlatformEventName(eventName)) {
      await this.onAnyDomainEvent(envelope);
    }
  }

  private async onProcessChildCompleted(payload: EventEnvelope): Promise<void> {
    if (!this.flags.isCallProcessEnabled()) {
      return;
    }

    if (!payload?.data || typeof payload.data !== 'object') {
      return;
    }

    const data = payload.data as Record<string, unknown>;
    if (!data.resumedParent) {
      return;
    }

    const parentStepInstanceId = Number(data.parentStepInstanceId);
    if (!parentStepInstanceId) {
      return;
    }

    this.logger.debug(
      `Child process completed; resuming parent step ${parentStepInstanceId}`,
      { correlationId: payload.correlationId },
    );

    await this.orchestrator.resumeParentAfterChildCallProcess(
      parentStepInstanceId,
      {
        cause: 'event',
        correlationId: payload.correlationId,
        actorTenantUserId: data.actorTenantUserId
          ? Number(data.actorTenantUserId)
          : undefined,
      },
    );
  }

  private async onProcessStepObjectValidated(
    payload: EventEnvelope,
  ): Promise<void> {
    if (!this.flags.isConfigObjectStepsEnabled()) {
      return;
    }

    const data = (payload.data ?? {}) as Record<string, unknown>;
    const stepInstanceId = data.stepInstanceId ?? data.step_instance_id;
    if (!stepInstanceId) {
      return;
    }

    await this.orchestrator.attemptAdvance(Number(stepInstanceId), {
      cause: 'event',
      correlationId: payload.correlationId,
      actorTenantUserId: data.updatedBy ? Number(data.updatedBy) : undefined,
    });
  }

  private async onSorBoundInstanceUpdated(payload: EventEnvelope): Promise<void> {
    await this.validateCoreLinkedBindingFromEvent(payload, 'sor_bound');
  }

  private async onSystemEntityUpdated(payload: EventEnvelope): Promise<void> {
    await this.validateCoreLinkedBindingFromEvent(payload, 'system_table');
  }

  private async validateCoreLinkedBindingFromEvent(
    payload: EventEnvelope,
    expectedMode: 'sor_bound' | 'system_table',
  ): Promise<void> {
    if (!this.flags.isConfigObjectStepsEnabled()) {
      return;
    }

    const data = (payload.data ?? {}) as Record<string, unknown>;
    const objectType = data.objectType ?? data.object_type;
    const coreId = data.coreId ?? data.core_id ?? data.entityId;
    const tenantId = payload.tenantId;

    if (!objectType || !coreId || !tenantId) {
      return;
    }

    const resolutionMode = String(
      data.resolutionMode ?? data.resolution_mode ?? expectedMode,
    );
    if (resolutionMode !== expectedMode) {
      return;
    }

    const result = await this.configObjectExecutor.validateByCoreLink(
      Number(tenantId),
      String(objectType),
      Number(coreId),
      payload.correlationId,
    );

    if (!result.anyValid) {
      return;
    }

    for (const stepInstanceId of result.stepInstanceIds) {
      await this.orchestrator.attemptAdvance(stepInstanceId, {
        cause: 'event',
        correlationId: payload.correlationId,
      });
    }
  }

  private async onConfigObjectInstanceUpdated(
    payload: EventEnvelope,
  ): Promise<void> {
    if (!this.flags.isConfigObjectStepsEnabled()) {
      return;
    }

    const entity = payload.entity as Record<string, unknown> | undefined;
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const configCustomObjectInstanceId =
      data.configCustomObjectInstanceId ??
      data.config_custom_object_instance_id ??
      entity?.entityId;

    if (!configCustomObjectInstanceId) {
      return;
    }

    const updatedBy = data.updatedBy ?? data.updated_by ?? data.userId ?? 1;

    const result = await this.configObjectExecutor.validateByCustomInstanceId(
      Number(configCustomObjectInstanceId),
      Number(updatedBy),
      payload.correlationId,
    );

    if (!result.stepInstanceId) {
      return;
    }

    this.logger.debug(
      `Config object instance ${configCustomObjectInstanceId} validated=${result.valid} stepId=${result.stepInstanceId}`,
    );

    if (result.valid) {
      await this.orchestrator.attemptAdvance(result.stepInstanceId, {
        cause: 'event',
        correlationId: payload.correlationId,
        actorTenantUserId: Number(updatedBy),
      });
    }
  }

  private async onRequirementEvent(payload: EventEnvelope): Promise<void> {
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const entity = payload.entity as Record<string, unknown> | undefined;
    const requirementInstanceId =
      data.requirementInstanceId ??
      data.requirement_instance_id ??
      entity?.entityId;

    if (!requirementInstanceId) {
      return;
    }

    const stepId = await this.findStepIdByRequirement(
      Number(requirementInstanceId),
    );
    if (!stepId) {
      return;
    }

    this.logger.debug(`Requirement event mapped to stepId=${stepId}`, {
      correlationId: payload.correlationId,
    });

    await this.orchestrator.attemptAdvance(stepId, {
      cause: 'event',
      correlationId: payload.correlationId,
    });
  }

  private async onAnyDomainEvent(payload: EventEnvelope): Promise<void> {
    const eventName = payload.eventName;
    const data = (payload.data ?? {}) as Record<string, unknown>;

    this.logger.debug(`Domain event received: ${eventName}`, {
      correlationId: payload.correlationId,
      processInstanceId: data.processInstanceId ?? data.process_instance_id,
    });

    const processInstanceId =
      data.processInstanceId ?? data.process_instance_id ?? null;

    const params: unknown[] = [eventName];
    let query = `
      SELECT t.trigger_instance_id, t.step_instance_id, t.json_schema
        FROM process_instance_step_triggers t
       WHERE JSON_UNQUOTE(JSON_EXTRACT(t.json_schema, '$.type')) = 'event'
         AND JSON_UNQUOTE(JSON_EXTRACT(t.json_schema, '$.eventName')) = ?
         AND t.status = 'unmet'
    `;

    if (processInstanceId) {
      query += ` AND t.step_instance_id IN (
        SELECT s.step_instance_id FROM process_instance_steps s
        WHERE s.process_instance_id = ?
      )`;
      params.push(processInstanceId);
    }

    const rows = await this.ds.query(query, params);
    if (!rows?.length) {
      return;
    }

    const ctx = {
      eventName,
      tenantId: payload.tenantId,
      payload: data,
      entity: payload.entity ?? {},
      processInstanceId,
      objectType: data.objectType,
      coreId: data.coreId,
      resolutionMode: data.resolutionMode,
      changedFields: data.changedFields,
      now: new Date().toISOString(),
    };

    const metStepIds = new Set<number>();
    for (const r of rows) {
      const where = r.json_schema?.where;
      const pass = where ? !!jsonLogic.apply(where, ctx) : true;
      if (pass) {
        await this.ds.query(
          `UPDATE process_instance_step_triggers
              SET status='met', met_at = NOW(), last_eval_at = NOW()
            WHERE trigger_instance_id = ?`,
          [r.trigger_instance_id],
        );
        metStepIds.add(r.step_instance_id);
      }
    }

    for (const stepId of metStepIds) {
      await this.orchestrator.attemptAdvance(stepId, {
        cause: 'event',
        correlationId: payload.correlationId,
      });
    }
  }

  private async findStepIdByRequirement(
    requirementInstanceId: number,
  ): Promise<number | null> {
    const [row] = await this.ds.query(
      `SELECT step_instance_id
         FROM process_instance_step_requirements
        WHERE requirement_instance_id = ?`,
      [requirementInstanceId],
    );
    return row?.step_instance_id ?? null;
  }
}
