import type { EntityManager } from 'typeorm';

/**
 * Gateway JWT often stamps `users.user_id` as actor id, while
 * `config_custom_object_instances.created_by` / `updated_by` FK
 * `tenant_users.tenant_user_id`. Resolve a safe tenant_user_id for the tenant.
 */
export async function resolveTenantUserActorId(
  em: Pick<EntityManager, 'query'>,
  tenantId: number,
  actorId: number,
): Promise<number> {
  const actor = Number(actorId);
  if (!Number.isInteger(actor) || actor < 1) {
    throw new Error('Invalid actor id for tenant_users FK');
  }

  const [byTenantUserId] = await em.query(
    `SELECT tenant_user_id
       FROM tenant_users
      WHERE tenant_id = ?
        AND tenant_user_id = ?
      LIMIT 1`,
    [tenantId, actor],
  );
  if (byTenantUserId?.tenant_user_id != null) {
    return Number(byTenantUserId.tenant_user_id);
  }

  const [byUserId] = await em.query(
    `SELECT tenant_user_id
       FROM tenant_users
      WHERE tenant_id = ?
        AND user_id = ?
      LIMIT 1`,
    [tenantId, actor],
  );
  if (byUserId?.tenant_user_id != null) {
    return Number(byUserId.tenant_user_id);
  }

  const [fallback] = await em.query(
    `SELECT tenant_user_id
       FROM tenant_users
      WHERE tenant_id = ?
      ORDER BY tenant_user_id ASC
      LIMIT 1`,
    [tenantId],
  );
  if (fallback?.tenant_user_id != null) {
    return Number(fallback.tenant_user_id);
  }

  throw new Error('No tenant_users row available for actor id');
}
