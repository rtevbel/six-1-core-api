import {
  parseRecipientSpec,
  type RecipientSpec,
} from '../events/notification-rules/recipient-spec.types';

/** Reuses notification rule recipient DSL for template step assignee resolution. */
export type ProcessStepAssigneeSpec = RecipientSpec;

export interface ProcessStepAssigneeResolveContext {
  tenantId: number;
  processInstanceId: number;
  stepInstanceId: number;
  /** Platform user id of the actor triggering resolution (event_actor). */
  actorUserId?: number;
  /** Tenant user id of the actor (process starter / advancer). */
  actorTenantUserId?: number;
  subjectType: string;
  subjectId: number;
  subjectMetadata: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
}

/**
 * Parses stored assignee spec JSON. Returns `null` when unset or invalid
 * (no implicit `event_actor` default — empty spec means no assignees).
 */
export function parseAssigneeSpec(raw: unknown): ProcessStepAssigneeSpec | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const type = (raw as Record<string, unknown>).type;
  if (typeof type !== 'string' || !type.trim()) {
    return null;
  }
  return parseRecipientSpec(raw);
}
