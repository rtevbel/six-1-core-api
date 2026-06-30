import type { EventEmitOptions } from './interfaces/event-emit-options.interface';
import type { EventEnvelopeRefs } from './types';
import {
  PLATFORM_SYSTEM_TABLE_OBJECT_TYPES,
  appendDomainBindingHints,
  buildSystemTableDomainEventOptions,
} from './platform-domain-event.util';
import { resolveCorrelationId } from './platform-correlation.util';
import { buildSystemTablePlatformEntityRef } from './platform-entity-ref.util';

/** Shared context for process step lifecycle emissions (P1). */
export interface ProcessStepEventContext {
  tenantId?: number;
  stepInstanceId: number;
  processInstanceId: number;
  stepOrder?: number;
  stepName?: string;
  processTemplateId?: number;
  assigneeId?: number;
  assigneeIds?: number[];
  customerCoreId?: number;
  correlationId?: string;
  cause?: string;
  actorTenantUserId?: number;
}

/** Shared context for process instance lifecycle emissions (P1). */
export interface ProcessInstanceEventContext {
  tenantId?: number;
  processInstanceId: number;
  processTemplateId?: number;
  correlationId?: string;
  cause?: string;
  subjectType?: string;
  subjectId?: number;
  actorTenantUserId?: number;
}

/** Context for child process spawn / terminal events (P1). */
export interface ProcessChildEventContext {
  tenantId?: number;
  childProcessInstanceId: number;
  parentProcessInstanceId: number;
  parentStepInstanceId: number;
  correlationId?: string;
  terminalStatus?: 'completed' | 'canceled';
  resumedParent?: boolean;
  cause?: string;
}

function buildProcessStepRefs(
  ctx: Pick<ProcessStepEventContext, 'processInstanceId' | 'stepInstanceId'>,
): EventEnvelopeRefs {
  return {
    processInstanceId: ctx.processInstanceId,
    stepInstanceId: ctx.stepInstanceId,
  };
}

function buildProcessStepData(ctx: ProcessStepEventContext): Record<string, unknown> {
  const data: Record<string, unknown> = {
    processInstanceId: ctx.processInstanceId,
    stepInstanceId: ctx.stepInstanceId,
    cause: ctx.cause ?? 'event',
  };

  if (ctx.stepOrder != null) {
    data.stepOrder = ctx.stepOrder;
  }
  if (ctx.stepName) {
    data.stepName = ctx.stepName;
  }
  if (ctx.processTemplateId != null) {
    data.processTemplateId = ctx.processTemplateId;
  }
  if (ctx.assigneeId != null) {
    data.assigneeId = ctx.assigneeId;
  }
  if (ctx.assigneeIds?.length) {
    data.assigneeIds = ctx.assigneeIds;
  }
  if (ctx.customerCoreId != null) {
    data.customerCoreId = ctx.customerCoreId;
  }

  return appendDomainBindingHints(
    data,
    PLATFORM_SYSTEM_TABLE_OBJECT_TYPES.PROCESS_INSTANCE_STEP,
    'system_table',
    ctx.stepInstanceId,
  );
}

/**
 * Standard emit options for `six1-event.process_step_*` producers.
 */
export function buildProcessStepEventOptions(
  ctx: ProcessStepEventContext,
): EventEmitOptions {
  return {
    tenantId: ctx.tenantId,
    correlationId: resolveCorrelationId(ctx.correlationId),
    userId: ctx.actorTenantUserId,
    createdBy: ctx.actorTenantUserId,
    entity: buildSystemTablePlatformEntityRef(
      PLATFORM_SYSTEM_TABLE_OBJECT_TYPES.PROCESS_INSTANCE_STEP,
      ctx.stepInstanceId,
    ),
    refs: buildProcessStepRefs(ctx),
    data: buildProcessStepData(ctx),
  };
}

/**
 * Standard emit options for `six1-event.process_started` / `process_completed`.
 */
export function buildProcessInstanceEventOptions(
  ctx: ProcessInstanceEventContext,
): EventEmitOptions {
  const data: Record<string, unknown> = {
    processInstanceId: ctx.processInstanceId,
    cause: ctx.cause ?? 'event',
  };

  if (ctx.processTemplateId != null) {
    data.processTemplateId = ctx.processTemplateId;
  }
  if (ctx.correlationId) {
    data.correlationId = ctx.correlationId;
  }
  if (ctx.subjectType) {
    data.subjectType = ctx.subjectType;
  }
  if (ctx.subjectId != null) {
    data.subjectId = ctx.subjectId;
  }

  return buildSystemTableDomainEventOptions({
    objectType: PLATFORM_SYSTEM_TABLE_OBJECT_TYPES.PROCESS_INSTANCE,
    entityId: ctx.processInstanceId,
    tenantId: ctx.tenantId,
    actorUserId: ctx.actorTenantUserId,
    correlationId: ctx.correlationId,
    data,
    refs: { processInstanceId: ctx.processInstanceId },
  });
}

/**
 * Standard emit options for `six1-event.process_child_*` producers.
 */
export function buildProcessChildEventOptions(
  ctx: ProcessChildEventContext,
): EventEmitOptions {
  const data: Record<string, unknown> = {
    childProcessInstanceId: ctx.childProcessInstanceId,
    parentProcessInstanceId: ctx.parentProcessInstanceId,
    parentStepInstanceId: ctx.parentStepInstanceId,
    cause: ctx.cause ?? 'event',
  };

  if (ctx.terminalStatus) {
    data.terminalStatus = ctx.terminalStatus;
  }
  if (ctx.resumedParent != null) {
    data.resumedParent = ctx.resumedParent;
  }

  return buildSystemTableDomainEventOptions({
    objectType: PLATFORM_SYSTEM_TABLE_OBJECT_TYPES.PROCESS_INSTANCE,
    entityId: ctx.childProcessInstanceId,
    tenantId: ctx.tenantId,
    correlationId: ctx.correlationId,
    data,
    refs: {
      processInstanceId: ctx.childProcessInstanceId,
      stepInstanceId: ctx.parentStepInstanceId,
    },
  });
}
