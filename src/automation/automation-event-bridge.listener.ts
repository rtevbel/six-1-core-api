// src/automation/automation-event-bridge.listener.ts

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import jsonLogic from 'json-logic-js';
import { StepOrchestratorService } from './step-orchestrator.service';

// Define the structure of the event payload
type AnyEvent = {
  entity?: { entityType?: string | null; entityId?: number | string | null }; // Entity details
  data?: any; // Event-specific data
  correlationId?: string; // Correlation ID for tracing
  tenantId?: number | string; // Tenant ID for multi-tenancy
};

/**
 * AutomationEventBridgeListener listens to domain events and processes them
 * to trigger step advancements in workflows.
 */
@Injectable()
export class AutomationEventBridgeListener {
  constructor(
    private readonly ds: DataSource, // TypeORM DataSource for database queries
    private readonly orchestrator: StepOrchestratorService, // Service to handle step orchestration
  ) {}

  /**
   * Handles requirement-related events (approved/rejected/submitted).
   * Attempts to advance the owning step based on the event.
   */
  @OnEvent('six1-event.requirement.*')
  async onRequirementEvent(payload: AnyEvent) {
    // Extract the requirement instance ID from the event payload
    const requirementInstanceId =
      payload?.data?.requirementInstanceId ??
      payload?.data?.requirement_instance_id ??
      payload?.entity?.entityId;

    if (!requirementInstanceId) return; // Exit if no requirement instance ID is found

    // Find the step ID associated with the requirement
    const stepId = await this.findStepIdByRequirement(requirementInstanceId);
    if (!stepId) return; // Exit if no step ID is found

    // Attempt to advance the step
    await this.orchestrator.attemptAdvance(stepId, {
      cause: 'event',
      correlationId: payload.correlationId,
    });
  }

  /**
   * Handles generic domain events to fulfill 'event'-type triggers
   * and attempts to advance affected steps.
   */
  @OnEvent('six1-event.*')
  async onAnyDomainEvent(payload: AnyEvent, eventName: string) {
    // Extract the process instance ID from the event payload
    const processInstanceId =
      payload?.data?.processInstanceId ??
      payload?.data?.process_instance_id ??
      null;

    // Query to find unmet event triggers that match the event
    const params: any[] = [eventName];
    let query = `
      SELECT t.trigger_instance_id, t.step_instance_id, t.json_schema
        FROM process_instance_step_triggers t
       WHERE JSON_UNQUOTE(JSON_EXTRACT(t.json_schema, '$.type')) = 'event'
         AND JSON_UNQUOTE(JSON_EXTRACT(t.json_schema, '$.eventName')) = ?
         AND t.status = 'unmet'
    `;
    if (processInstanceId) {
      // Scope the query to the process instance if provided
      query += ` AND t.step_instance_id IN (
        SELECT s.step_instance_id FROM process_instance_steps s
        WHERE s.process_instance_id = ?
      )`;
      params.push(processInstanceId);
    }

    // Execute the query to find matching triggers
    const rows = await this.ds.query(query, params);
    if (!rows?.length) return; // Exit if no triggers are found

    // Build a context object for JSONLogic evaluation
    const ctx = {
      eventName,
      tenantId: payload?.tenantId,
      payload: payload?.data ?? {},
      entity: payload?.entity ?? {},
      processInstanceId,
      now: new Date().toISOString(),
    };

    const metStepIds = new Set<number>(); // Track step IDs with met triggers
    for (const r of rows) {
      const where = r.json_schema?.where; // Extract the "where" condition from the trigger schema
      const pass = where ? !!jsonLogic.apply(where, ctx) : true; // Evaluate the condition using JSONLogic
      if (pass) {
        // Mark the trigger as met
        await this.ds.query(
          `UPDATE process_instance_step_triggers
              SET status='met', met_at = NOW(), last_eval_at = NOW()
            WHERE trigger_instance_id = ?`,
          [r.trigger_instance_id],
        );
        metStepIds.add(r.step_instance_id); // Add the step ID to the set
      }
    }

    // Attempt to advance all steps with met triggers
    for (const stepId of metStepIds) {
      await this.orchestrator.attemptAdvance(stepId, {
        cause: 'event',
        correlationId: payload?.correlationId,
      });
    }
  }

  /**
   * Helper method to find the step ID associated with a requirement instance.
   * 
   * @param requirementInstanceId - The ID of the requirement instance.
   * @returns The step ID or null if not found.
   */
  private async findStepIdByRequirement(requirementInstanceId: number): Promise<number | null> {
    const [row] = await this.ds.query(
      `SELECT step_instance_id
         FROM process_instance_step_requirements
        WHERE requirement_instance_id = ?`,
      [requirementInstanceId],
    );
    return row?.step_instance_id ?? null; // Return the step ID or null if not found
  }
}