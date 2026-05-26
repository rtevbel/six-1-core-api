import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import jsonLogic from 'json-logic-js';
import { StepOrchestratorService } from './step-orchestrator.service';
import { ConfigObjectStepExecutor } from './config-object-step-executor.service';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';

type AnyEvent = {
  entity?: { entityType?: string | null; entityId?: number | string | null };
  data?: any;
  correlationId?: string;
  tenantId?: number | string;
};

@Injectable()
export class AutomationEventBridgeListener {
  private readonly logger = new Logger(AutomationEventBridgeListener.name);

  constructor(
    private readonly ds: DataSource,
    private readonly orchestrator: StepOrchestratorService,
    private readonly configObjectExecutor: ConfigObjectStepExecutor,
    private readonly flags: ProcessFeatureFlagsService,
  ) {}

  @OnEvent('six1-event.process_child_completed', { async: true })
  async onProcessChildCompleted(payload: AnyEvent) {
    if (!this.flags.isCallProcessEnabled()) {
      return;
    }

    if (!payload?.data?.resumedParent) {
      return;
    }

    const parentStepInstanceId = Number(payload.data.parentStepInstanceId);
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
        actorTenantUserId: payload?.data?.actorTenantUserId
          ? Number(payload.data.actorTenantUserId)
          : undefined,
      },
    );
  }

  @OnEvent('six1-event.process_step_object_validated', { async: true })
  async onProcessStepObjectValidated(payload: AnyEvent) {
    if (!this.flags.isConfigObjectStepsEnabled()) {
      return;
    }

    const stepInstanceId =
      payload?.data?.stepInstanceId ?? payload?.data?.step_instance_id;

    if (!stepInstanceId) {
      return;
    }

    await this.orchestrator.attemptAdvance(Number(stepInstanceId), {
      cause: 'event',
      correlationId: payload.correlationId,
      actorTenantUserId: payload?.data?.updatedBy
        ? Number(payload.data.updatedBy)
        : undefined,
    });
  }

  @OnEvent('six1-event.config_object_instance.updated', { async: true })
  async onConfigObjectInstanceUpdated(payload: AnyEvent) {
    if (!this.flags.isConfigObjectStepsEnabled()) {
      return;
    }

    const configCustomObjectInstanceId =
      payload?.data?.configCustomObjectInstanceId ??
      payload?.data?.config_custom_object_instance_id ??
      payload?.entity?.entityId;

    if (!configCustomObjectInstanceId) {
      return;
    }

    const updatedBy =
      payload?.data?.updatedBy ??
      payload?.data?.updated_by ??
      payload?.data?.userId ??
      1;

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

  @OnEvent('six1-event.requirement.*', { async: true })
  async onRequirementEvent(payload: AnyEvent) {
    const requirementInstanceId =
      payload?.data?.requirementInstanceId ??
      payload?.data?.requirement_instance_id ??
      payload?.entity?.entityId;

    if (!requirementInstanceId) return;
    const stepId = await this.findStepIdByRequirement(requirementInstanceId);
    if (!stepId) return;

    this.logger.debug(
      `Requirement event mapped to stepId=${stepId}`,
      { correlationId: payload.correlationId },
    );
    await this.orchestrator.attemptAdvance(stepId, {
      cause: 'event',
      correlationId: payload.correlationId,
    });
  }

  @OnEvent('six1-event.*', { async: true })
  async onAnyDomainEvent(payload: AnyEvent, eventName: string) {
    this.logger.debug(`Domain event received: ${eventName}`, {
      correlationId: payload.correlationId,
      processInstanceId:
        payload?.data?.processInstanceId ?? payload?.data?.process_instance_id,
    });
    const processInstanceId =
      payload?.data?.processInstanceId ??
      payload?.data?.process_instance_id ??
      null;

    const params: any[] = [eventName];
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
    if (!rows?.length) return;

    const ctx = {
      eventName,
      tenantId: payload?.tenantId,
      payload: payload?.data ?? {},
      entity: payload?.entity ?? {},
      processInstanceId,
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
        correlationId: payload?.correlationId,
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
