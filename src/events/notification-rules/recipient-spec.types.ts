/**
 * Recipient specification DSL for event notification rules (P2–P3).
 */
export type RecipientSpecType =
  | 'explicit_user_ids'
  | 'event_actor'
  | 'event_payload_field'
  | 'tenant_role'
  | 'tenant_admins'
  | 'assignee'
  | 'workflow_customer_email';

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
  /** Multiple role display names (UI multi-select). */
  roleNames?: string[];
  /** Permission name (e.g. `finance.approve`). */
  permission?: string;
  /** Multiple permission names (UI multi-select). */
  permissions?: string[];
}

export interface TenantAdminsRecipientSpec {
  type: 'tenant_admins';
}

export interface AssigneeRecipientSpec {
  type: 'assignee';
  /** Optional override; otherwise known assignee payload paths are tried. */
  path?: string;
}

export interface WorkflowCustomerEmailRecipientSpec {
  type: 'workflow_customer_email';
}

export type RecipientSpec =
  | ExplicitUserIdsRecipientSpec
  | EventActorRecipientSpec
  | EventPayloadFieldRecipientSpec
  | TenantRoleRecipientSpec
  | TenantAdminsRecipientSpec
  | AssigneeRecipientSpec
  | WorkflowCustomerEmailRecipientSpec;

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

function normalizeStringList(
  listValue: unknown,
  singularValue: unknown,
): string[] {
  const fromList = Array.isArray(listValue)
    ? listValue
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const fromSingular =
    typeof singularValue === 'string' && singularValue.trim()
      ? [singularValue.trim()]
      : [];

  return [...new Set([...fromList, ...fromSingular])];
}

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
    const roleNames = normalizeStringList(spec.roleNames, spec.roleName);
    const permissions = normalizeStringList(spec.permissions, spec.permission);

    if (permissions.length > 0 && roleNames.length === 0) {
      if (permissions.length === 1) {
        return { type: 'tenant_role', permission: permissions[0] };
      }
      return { type: 'tenant_role', permissions };
    }

    if (roleNames.length === 1) {
      return { type: 'tenant_role', roleName: roleNames[0] };
    }
    if (roleNames.length > 1) {
      return { type: 'tenant_role', roleNames };
    }

    // Preserve type even when selectors are empty (draft / incomplete UI state).
    return { type: 'tenant_role' };
  }

  if (type === 'tenant_admins') {
    return { type: 'tenant_admins' };
  }

  if (type === 'assignee') {
    const path = typeof spec.path === 'string' ? spec.path.trim() : undefined;
    return path ? { type: 'assignee', path } : { type: 'assignee' };
  }

  if (type === 'workflow_customer_email') {
    return { type: 'workflow_customer_email' };
  }

  if (type === 'event_actor') {
    return { type: 'event_actor' };
  }

  return DEFAULT_RECIPIENT_SPEC;
}
