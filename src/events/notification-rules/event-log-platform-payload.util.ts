import type { EventEnvelope } from '../types';

/** Rule dispatch metadata stored on `event_logs.payload` (P2). */
export interface EventLogRuleDispatch {
  ruleId: number;
  channelId: number;
  templateId: number;
  destinationEmail?: string;
}

export interface EventLogPlatformPayload {
  eventName?: string;
  correlationId?: string;
  causationId?: string;
  tenantId?: number | string;
  occurredAt?: string;
  refs?: import('../types').EventEnvelopeRefs;
  data?: Record<string, unknown>;
  ruleDispatch?: EventLogRuleDispatch;
}

export function buildRuleDispatchEventLogPayload(
  envelope: EventEnvelope,
  eventName: string,
  dispatch: EventLogRuleDispatch,
): EventLogPlatformPayload {
  const data =
    envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data)
      ? (envelope.data as Record<string, unknown>)
      : undefined;

  return {
    eventName,
    correlationId: envelope.correlationId,
    causationId: envelope.causationId,
    tenantId: envelope.tenantId,
    occurredAt: (envelope.occurredAt ?? new Date()).toISOString(),
    refs: envelope.refs,
    data,
    ruleDispatch: dispatch,
  };
}

export function readRuleDispatchFromPayload(
  payload: unknown,
): EventLogRuleDispatch | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const dispatch = (payload as EventLogPlatformPayload).ruleDispatch;
  if (!dispatch || typeof dispatch !== 'object') {
    return null;
  }

  const ruleId = Number(dispatch.ruleId);
  const channelId = Number(dispatch.channelId);
  const templateId = Number(dispatch.templateId);

  if (
    !Number.isFinite(ruleId) ||
    !Number.isFinite(channelId) ||
    !Number.isFinite(templateId)
  ) {
    return null;
  }

  return { ruleId, channelId, templateId };
}

export function readDestinationEmailFromPayload(
  payload: unknown,
): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const dispatch = (payload as EventLogPlatformPayload).ruleDispatch;
  const email =
    typeof dispatch?.destinationEmail === 'string'
      ? dispatch.destinationEmail.trim()
      : '';
  return email || null;
}
