import type { EntityManager } from 'typeorm';

/** Stored tenant id for global / super-admin scope (process templates, instances, etc.). */
export const GLOBAL_SYSTEM_TENANT_ID = 0;

const SYSTEM_USER_USERNAME = 'system';
const SYSTEM_TENANT_IDENTIFIER = 'system';

type SqlExecutor = Pick<EntityManager, 'query'>;

/**
 * Migration 1710000000002 may have created a tenant with identifier `system` but
 * AUTO_INCREMENT assigned a non-zero id. Free the unique identifier before insert.
 */
export async function releaseConflictingSystemTenantIdentifier(
  em: SqlExecutor,
): Promise<void> {
  await em.query(
    `
    UPDATE tenants
       SET tenant_indentifier = CONCAT('__legacy_system_', tenant_id)
     WHERE tenant_indentifier = ?
       AND tenant_id != ?
    `,
    [SYSTEM_TENANT_IDENTIFIER, GLOBAL_SYSTEM_TENANT_ID],
  );
}

async function ensureSystemUser(em: SqlExecutor): Promise<void> {
  await em.query(
    `
    INSERT INTO users (
      email,
      username,
      first_name,
      last_name,
      password,
      status,
      display_name,
      dashboard_url,
      activation_key,
      created_at,
      updated_at,
      last_login_at
    )
    SELECT
      'system@six1.local',
      ?,
      'System',
      'Account',
      'system',
      1,
      'System Account',
      NULL,
      NULL,
      NOW(6),
      NOW(6),
      NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM users u WHERE u.username = ?
    )
    `,
    [SYSTEM_USER_USERNAME, SYSTEM_USER_USERNAME],
  );
}

async function findSystemUserTenantId(
  em: SqlExecutor,
): Promise<number | null> {
  const rows: Array<{ tenant_id: number }> = await em.query(
    `
    SELECT t.tenant_id
      FROM tenants t
      JOIN users u ON u.user_id = t.user_id
     WHERE u.username = ?
     LIMIT 1
    `,
    [SYSTEM_USER_USERNAME],
  );
  if (!rows.length) {
    return null;
  }
  return Number(rows[0].tenant_id);
}

async function withNoAutoValueOnZero<T>(
  em: SqlExecutor,
  fn: () => Promise<T>,
): Promise<T> {
  const modeRows: Array<{ sql_mode: string }> = await em.query(
    'SELECT @@SESSION.sql_mode AS sql_mode',
  );
  const previousMode = modeRows[0]?.sql_mode ?? '';

  await em.query(`SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO'`);
  try {
    return await fn();
  } finally {
    await em.query('SET SESSION sql_mode = ?', [previousMode]);
  }
}

/**
 * Repoints the system user's tenant row to `tenant_id = 0` (failed migration 1710000000002).
 */
export async function repointSystemUserTenantToZero(
  em: SqlExecutor,
): Promise<void> {
  await withNoAutoValueOnZero(em, async () => {
    await em.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      await em.query(
        `
        UPDATE tenants t
        JOIN users u ON u.user_id = t.user_id AND u.username = ?
           SET t.tenant_id = ?,
               t.name = 'SYSTEM',
               t.tenant_indentifier = ?
         WHERE t.tenant_id != ?
        `,
        [
          SYSTEM_USER_USERNAME,
          GLOBAL_SYSTEM_TENANT_ID,
          SYSTEM_TENANT_IDENTIFIER,
          GLOBAL_SYSTEM_TENANT_ID,
        ],
      );
    } finally {
      await em.query('SET FOREIGN_KEY_CHECKS = 1');
    }
  });
}

async function insertSystemTenantRow(em: SqlExecutor): Promise<void> {
  await releaseConflictingSystemTenantIdentifier(em);

  await withNoAutoValueOnZero(em, async () => {
    await em.query(
      `
      INSERT INTO tenants (
        tenant_id,
        name,
        tenant_type_id,
        tenant_indentifier,
        user_id,
        status_id
      )
      SELECT
        ? AS tenant_id,
        'SYSTEM' AS name,
        tt.tenant_type_id,
        ? AS tenant_indentifier,
        u.user_id,
        s.status_id
      FROM tenant_types tt
      CROSS JOIN system_statuses s
      JOIN users u ON u.username = ?
      WHERE NOT EXISTS (
        SELECT 1 FROM tenants t WHERE t.tenant_id = ?
      )
      LIMIT 1
      `,
      [
        GLOBAL_SYSTEM_TENANT_ID,
        SYSTEM_TENANT_IDENTIFIER,
        SYSTEM_USER_USERNAME,
        GLOBAL_SYSTEM_TENANT_ID,
      ],
    );
  });
}

/**
 * Ensures the synthetic SYSTEM tenant (`tenant_id = 0`) exists for FK-backed global scope.
 */
export async function ensureSystemTenantRow(em: SqlExecutor): Promise<void> {
  const existing: Array<{ tenant_id: number }> = await em.query(
    'SELECT tenant_id FROM tenants WHERE tenant_id = ? LIMIT 1',
    [GLOBAL_SYSTEM_TENANT_ID],
  );
  if (existing.length > 0) {
    return;
  }

  await ensureSystemUser(em);

  const systemUserTenantId = await findSystemUserTenantId(em);
  if (systemUserTenantId != null) {
    await repointSystemUserTenantToZero(em);
    return;
  }

  await insertSystemTenantRow(em);
}
