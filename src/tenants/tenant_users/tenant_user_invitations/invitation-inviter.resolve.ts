export type InviterTenantUserRef = {
  tenantUserId: number;
};

/**
 * `invited_by` is a FK to `tenant_users.tenant_user_id`.
 * Callers often send JWT `userId`; resolve to the actor's membership in the tenant.
 */
export async function resolveInviterTenantUserId(params: {
  tenantId: number;
  actorUserId: number;
  suggestedInvitedBy?: number | null;
  findByTenantUserId: (
    tenantUserId: number,
    tenantId: number,
  ) => Promise<InviterTenantUserRef | null>;
  findByUserId: (
    userId: number,
    tenantId: number,
  ) => Promise<InviterTenantUserRef | null>;
}): Promise<number> {
  const suggested =
    typeof params.suggestedInvitedBy === 'number' &&
    Number.isInteger(params.suggestedInvitedBy) &&
    params.suggestedInvitedBy > 0
      ? params.suggestedInvitedBy
      : null;

  if (suggested != null) {
    const byPk = await params.findByTenantUserId(suggested, params.tenantId);
    if (byPk) return byPk.tenantUserId;
  }

  const byActor = await params.findByUserId(
    params.actorUserId,
    params.tenantId,
  );
  if (byActor) return byActor.tenantUserId;

  throw new Error('Inviter is not a member of this tenant.');
}
