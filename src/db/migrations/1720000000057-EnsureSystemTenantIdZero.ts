import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  repointSystemUserTenantToZero,
  releaseConflictingSystemTenantIdentifier,
  GLOBAL_SYSTEM_TENANT_ID,
} from '../../tenants/system-tenant.bootstrap';

const SYSTEM_USER_USERNAME = 'system';

/**
 * Repairs global scope: `tenant_id = 0` must exist in `tenants` for FK-backed tables.
 * Handles failed migration 1710000000002 (wrong auto-increment id and/or duplicate `system` user).
 */
export class EnsureSystemTenantIdZero1720000000057
  implements MigrationInterface
{
  name = 'EnsureSystemTenantIdZero1720000000057';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing: Array<{ tenant_id: number }> = await queryRunner.query(
      'SELECT tenant_id FROM tenants WHERE tenant_id = 0 LIMIT 1',
    );
    if (existing.length > 0) {
      return;
    }

    await queryRunner.query(`
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
        '${SYSTEM_USER_USERNAME}',
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
        SELECT 1 FROM users u WHERE u.username = '${SYSTEM_USER_USERNAME}'
      );
    `);

    const ownedRows: Array<{ tenant_id: number }> = await queryRunner.query(
      `
      SELECT t.tenant_id
        FROM tenants t
        JOIN users u ON u.user_id = t.user_id
       WHERE u.username = ?
       LIMIT 1
      `,
      [SYSTEM_USER_USERNAME],
    );

    if (ownedRows.length > 0) {
      await repointSystemUserTenantToZero(queryRunner);
      return;
    }

    await releaseConflictingSystemTenantIdentifier(queryRunner);

    const modeRows: Array<{ sql_mode: string }> = await queryRunner.query(
      'SELECT @@SESSION.sql_mode AS sql_mode',
    );
    const previousMode = modeRows[0]?.sql_mode ?? '';

    await queryRunner.query(`SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO'`);

    try {
      await queryRunner.query(`
        INSERT INTO tenants (
          tenant_id,
          name,
          tenant_type_id,
          tenant_indentifier,
          user_id,
          status_id
        )
        SELECT
          ${GLOBAL_SYSTEM_TENANT_ID} AS tenant_id,
          'SYSTEM' AS name,
          tt.tenant_type_id,
          'system' AS tenant_indentifier,
          u.user_id,
          s.status_id
        FROM tenant_types tt
        CROSS JOIN system_statuses s
        JOIN users u ON u.username = '${SYSTEM_USER_USERNAME}'
        WHERE NOT EXISTS (
          SELECT 1 FROM tenants t WHERE t.tenant_id = ${GLOBAL_SYSTEM_TENANT_ID}
        )
        LIMIT 1;
      `);
    } finally {
      await queryRunner.query('SET SESSION sql_mode = ?', [previousMode]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM tenants WHERE tenant_id = 0 AND name = 'SYSTEM';
    `);
  }
}
