import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import jsonLogic from 'json-logic-js';
import { StepOrchestratorService } from './step-orchestrator.service';

type AnyEvent = {
  entity?: { entityType?: string | null; entityId?: number | string | null };
  data?: any;
  correlationId?: string;
  tenantId?: number | string;
};

@Injectable()
export class AutomationEventBridgeListener {
  constructor(
    private readonly ds: DataSource,
    private readonly orchestrator: StepOrchestratorService,
  ) {}

  @OnEvent('six1-event.requirement.*', { async: true })
  async onRequirementEvent(payload: AnyEvent) {
    const requirementInstanceId =
      payload?.data?.requirementInstanceId ??
      payload?.data?.requirement_instance_id ??
      payload?.entity?.entityId;

    if (!requirementInstanceId) return;
    const stepId = await this.findStepIdByRequirement(requirementInstanceId);
    if (!stepId) return;

    console.log(`Event Bridge-> six1-event.requirement.* ->Received requirement event with payload:`, payload, 'mapped to stepId:', stepId);
    await this.orchestrator.attemptAdvance(stepId, {
      cause: 'event',
      correlationId: payload.correlationId,
    });
  }

  @OnEvent('six1-event.*', { async: true })
  async onAnyDomainEvent(payload: AnyEvent, eventName: string) {

    console.log(`Event Bridge-> six1-event.* ->Received event: ${eventName} with payload:`, payload);
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

  private async findStepIdByRequirement(requirementInstanceId: number): Promise<number | null> {
    const [row] = await this.ds.query(
      `SELECT step_instance_id
         FROM process_instance_step_requirements
        WHERE requirement_instance_id = ?`,
      [requirementInstanceId],
    );
    return row?.step_instance_id ?? null;
  }
}
