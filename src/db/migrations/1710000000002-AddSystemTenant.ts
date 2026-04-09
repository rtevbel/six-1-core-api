import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSystemTenant1710000000002 implements MigrationInterface {
  name = 'AddSystemTenant1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Ensure a dedicated "system" user exists.
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
        'system@six1.local'  AS email,
        'system'             AS username,
        'System'             AS first_name,
        'Account'            AS last_name,
        'system'             AS password,
        1                    AS status,
        'System Account'     AS display_name,
        NULL                 AS dashboard_url,
        NULL                 AS activation_key,
        NOW(6)               AS created_at,
        NOW(6)               AS updated_at,
        NULL                 AS last_login_at
      WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.username = 'system'
      );
    `);

    // 2) Create a synthetic "SYSTEM" tenant with tenant_id = 0 that is owned
    // by the dedicated "system" user. This supports global/template-set
    // records that use tenantId 0 while preserving the foreign key from
    // config_template_sets.
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
        0                           AS tenant_id,
        'SYSTEM'                    AS name,
        tt.tenant_type_id           AS tenant_type_id,
        'system'                    AS tenant_indentifier,
        u.user_id                   AS user_id,
        s.status_id                 AS status_id
      FROM tenant_types tt
      CROSS JOIN system_statuses s
      JOIN users u
        ON u.username = 'system'
      WHERE NOT EXISTS (
        SELECT 1 FROM tenants t WHERE t.tenant_id = 0
      )
      LIMIT 1;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the synthetic system tenant if present.
    await queryRunner.query(`
      DELETE FROM tenants WHERE tenant_id = 0;
    `);
  }
}

