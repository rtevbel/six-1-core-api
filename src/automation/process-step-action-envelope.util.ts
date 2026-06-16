import { getByPath } from '../notifications/context/notification-context-path.util';
import { PLATFORM_EVENT_NAMES } from '../events/constants/platform-event-names.constants';
import {
  buildEventEnvelope,
  buildSorBoundPlatformEntityRef,
  buildSystemTablePlatformEntityRef,
} from '../events/platform-entity-ref.util';
import {
  buildProcessInstanceEventOptions,
  buildProcessStepEventOptions,
} from '../events/platform-process-event.util';
import type { EventEnvelope, PlatformEntityRef } from '../events/types';
import {
  PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED,
  type ProcessStepActionRunOn,
} from './process-step-action.constants';

/** Synthetic catalog name for step-failed notification context until a dedicated event exists. */
export const PROCESS_STEP_ACTION_FAILED_ENVELOPE_EVENT =
  'six1-event.process_step_action' as const;

/** Inputs for building a process-step action {@link EventEnvelope}. */
export interface ProcessStepActionEnvelopeParams {
  tenantId: number;
  processInstanceId: number;
  processTemplateId: number;
  subjectType: string;
  subjectId: number;
  subjectMetadata?: Record<string, unknown> | null;
  processContext?: Record<string, unknown> | null;
  stepInstanceId: number;
  stepName?: string | null;
  stepOrder?: number;
  stepStatus?: string;
  runOn: ProcessStepActionRunOn;
  correlationId?: string | null;
  actorUserId?: number;
}

/** Canonical envelope event name for notification rendering by lifecycle hook. */
export function envelopeEventNameForRunOn(
  runOn: ProcessStepActionRunOn,
): string {
  switch (runOn) {
    case 'step_completed':
      return PLATFORM_EVENT_NAMES.PROCESS_STEP_COMPLETED;
    case 'process_completed':
      return PLATFORM_EVENT_NAMES.PROCESS_COMPLETED;
    case 'step_failed':
      return PROCESS_STEP_ACTION_FAILED_ENVELOPE_EVENT;
    default:
      return PROCESS_STEP_ACTION_FAILED_ENVELOPE_EVENT;
  }
}

/**
 * Merged tree for `coreIdPath` resolution and notification template variables.
 */
export function buildProcessStepActionRuntimeContext(
  params: ProcessStepActionEnvelopeParams,
): Record<string, unknown> {
  const processContext = params.processContext ?? {};
  const entity = buildEntityFromSubject(params);

  return {
    tenantId: params.tenantId,
    process: {
      instanceId: params.processInstanceId,
      templateId: params.processTemplateId,
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      context: processContext,
    },
    step: {
      instanceId: params.stepInstanceId,
      name: params.stepName ?? null,
      order: params.stepOrder,
      status: params.stepStatus ?? null,
    },
    subject: {
      type: params.subjectType,
      id: params.subjectId,
      metadata: params.subjectMetadata ?? null,
    },
    context: processContext,
    ...(entity ? { entity } : {}),
  };
}

function buildEntityFromSubject(
  params: ProcessStepActionEnvelopeParams,
): PlatformEntityRef | undefined {
  const meta = params.subjectMetadata;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return undefined;
  }

  const objectType =
    typeof meta.objectType === 'string' ? meta.objectType.trim() : '';
  const resolutionMode = meta.resolutionMode;
  const coreId = coercePositiveInt(meta.coreId);
  const instanceId = coercePositiveInt(meta.instanceId);

  if (
    objectType &&
    resolutionMode === 'sor_bound' &&
    coreId != null
  ) {
    return buildSorBoundPlatformEntityRef(objectType, coreId);
  }

  if (
    objectType &&
    resolutionMode === 'system_table' &&
    params.subjectId > 0
  ) {
    return buildSystemTablePlatformEntityRef(objectType, params.subjectId);
  }

  if (objectType && coreId != null) {
    return buildSorBoundPlatformEntityRef(objectType, coreId);
  }

  if (instanceId != null && objectType) {
    return {
      entityType: objectType,
      entityId: instanceId,
      objectType,
      resolutionMode: 'standalone',
      instanceId,
    };
  }

  return undefined;
}

export function coercePositiveInt(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.trunc(parsed);
}

/**
 * Resolves a positive integer from a dot-path on the process action runtime tree.
 */
export function resolvePositiveIntFromPath(
  root: Record<string, unknown>,
  path: string,
): number | null {
  const value = getByPath(root, path);
  return coercePositiveInt(value) ?? null;
}

/**
 * Optional `customerId` for nested `customer_*` SoR patches (from `context.customerId`).
 */
export function resolveOptionalCustomerIdFromRuntime(
  runtimeContext: Record<string, unknown>,
): number | undefined {
  return coercePositiveInt(
    getByPath(runtimeContext, 'context.customerId'),
  );
}

/**
 * Builds the envelope passed to P6 handlers for emit_event / send_notification.
 */
export function buildProcessStepActionEnvelope(
  params: ProcessStepActionEnvelopeParams,
): EventEnvelope {
  const runtimeContext = buildProcessStepActionRuntimeContext(params);
  const eventName = envelopeEventNameForRunOn(params.runOn);

  if (params.runOn === PROCESS_STEP_ACTION_RUN_ON_PROCESS_COMPLETED) {
    const opts = buildProcessInstanceEventOptions({
      tenantId: params.tenantId,
      processInstanceId: params.processInstanceId,
      processTemplateId: params.processTemplateId,
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      correlationId: params.correlationId ?? undefined,
      actorTenantUserId: params.actorUserId,
      cause: 'process_step_action',
    });

    return buildEventEnvelope(eventName, {
      ...opts,
      data: {
        ...(opts.data as Record<string, unknown>),
        runOn: params.runOn,
        context: runtimeContext.context,
        runtime: runtimeContext,
      },
    });
  }

  const opts = buildProcessStepEventOptions({
    tenantId: params.tenantId,
    stepInstanceId: params.stepInstanceId,
    processInstanceId: params.processInstanceId,
    stepOrder: params.stepOrder,
    stepName: params.stepName ?? undefined,
    processTemplateId: params.processTemplateId,
    correlationId: params.correlationId ?? undefined,
    actorTenantUserId: params.actorUserId,
    cause: 'process_step_action',
  });

  return buildEventEnvelope(eventName, {
    ...opts,
    data: {
      ...(opts.data as Record<string, unknown>),
      runOn: params.runOn,
      stepStatus: params.stepStatus,
      context: runtimeContext.context,
      runtime: runtimeContext,
    },
  });
}
