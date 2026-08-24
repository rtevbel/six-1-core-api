import { randomBytes } from 'crypto';

export function mintTenantUserInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

export function coerceOptionalPositiveInt(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/**
 * Server-owned invite fields: token, pending status, tenant, inviter.
 * Clients must not mint tokens or set accepted/declined on create.
 */
export function applyTenantUserInvitationCreateDefaults(params: {
  tenantId: number;
  actorUserId: number;
  email: string;
  roleId: number;
  token?: string | null;
  status?: string | null;
  invitedBy?: number | null;
  userId?: number | null;
  expiresAt?: string | null;
}): {
  tenantId: number;
  email: string;
  roleId: number;
  token: string;
  status: 'pending';
  invitedBy: number;
  userId: number | null;
  expiresAt?: string;
} {
  const token = params.token?.trim() || mintTenantUserInvitationToken();
  const invitedBy =
    coerceOptionalPositiveInt(params.invitedBy) ?? params.actorUserId;
  return {
    tenantId: params.tenantId,
    email: params.email.trim(),
    roleId: params.roleId,
    token,
    status: 'pending',
    invitedBy,
    userId: coerceOptionalPositiveInt(params.userId),
    ...(params.expiresAt?.trim() ? { expiresAt: params.expiresAt.trim() } : {}),
  };
}
