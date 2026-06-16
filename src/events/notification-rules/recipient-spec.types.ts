/**
 * Recipient specification DSL for event notification rules (P2–P3).
 */
export type RecipientSpecType =
  | 'explicit_user_ids'
  | 'event_actor'
  | 'event_payload_field'
  | 'tenant_role'
  | 'tenant_admins'
  | 'assignee';

export interface ExplicitUserIdsRecipientSpec {
  type: 'explicit_user_ids';
  userIds: number[];
}

export interface EventActorRecipientSpec {
  type: 'event_actor';
}

export interface EventPayloadFieldRecipientSpec {
  type: 'event_payload_field';
  /** Dot path on the envelope, e.g. `data.assigneeId`. */
  path: string;
}

export interface TenantRoleRecipientSpec {
  type: 'tenant_role';
  /** Role display name (e.g. `Manager`, `Admin`). */
  roleName?: string;
  /** Permission name (e.g. `finance.approve`). */
  permission?: string;
}

export interface TenantAdminsRecipientSpec {
  type: 'tenant_admins';
}

export interface AssigneeRecipientSpec {
  type: 'assignee';
  /** Optional override; otherwise known assignee payload paths are tried. */
  path?: string;
}

export type RecipientSpec =
  | ExplicitUserIdsRecipientSpec
  | EventActorRecipientSpec
  | EventPayloadFieldRecipientSpec
  | TenantRoleRecipientSpec
  | TenantAdminsRecipientSpec
  | AssigneeRecipientSpec;

export const DEFAULT_RECIPIENT_SPEC: EventActorRecipientSpec = {
  type: 'event_actor',
};

/** Default paths checked for `assignee` spec (process-ready hook). */
export const ASSIGNEE_PAYLOAD_PATHS = [
  'data.assigneeId',
  'data.assignee_id',
  'data.primaryAssigneeId',
  'data.primary_assignee_id',
] as const;

export function parseRecipientSpec(raw: unknown): RecipientSpec {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_RECIPIENT_SPEC;
  }

  const spec = raw as Record<string, unknown>;
  const type = spec.type;

  if (type === 'explicit_user_ids' && Array.isArray(spec.userIds)) {
    const userIds = spec.userIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);
    return { type: 'explicit_user_ids', userIds };
  }

  if (type === 'event_payload_field' && typeof spec.path === 'string') {
    const path = spec.path.trim();
    if (path) {
      return { type: 'event_payload_field', path };
    }
  }

  if (type === 'tenant_role') {
    const roleName =
      typeof spec.roleName === 'string' ? spec.roleName.trim() : undefined;
    const permission =
      typeof spec.permission === 'string' ? spec.permission.trim() : undefined;
    if (roleName || permission) {
      return {
        type: 'tenant_role',
        ...(roleName ? { roleName } : {}),
        ...(permission ? { permission } : {}),
      };
    }
  }

  if (type === 'tenant_admins') {
    return { type: 'tenant_admins' };
  }

  if (type === 'assignee') {
    const path = typeof spec.path === 'string' ? spec.path.trim() : undefined;
    return path ? { type: 'assignee', path } : { type: 'assignee' };
  }

  if (type === 'event_actor') {
    return { type: 'event_actor' };
  }

  return DEFAULT_RECIPIENT_SPEC;
}
