import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * System settings registry: groups, typed definitions, global/tenant values.
 */
export class SystemSettingsRegistry1720000000060 implements MigrationInterface {
  name = 'SystemSettingsRegistry1720000000060';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`system_setting_groups\` (
        \`group_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`group_key\` VARCHAR(100) NOT NULL,
        \`label\` VARCHAR(255) NOT NULL,
        \`description\` VARCHAR(1000) NULL,
        \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`is_active\` TINYINT UNSIGNED NOT NULL DEFAULT 1,
        \`created_by\` BIGINT UNSIGNED NOT NULL,
        \`updated_by\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`group_id\`),
        UNIQUE KEY \`uq_system_setting_groups_group_key\` (\`group_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`system_setting_definitions\` (
        \`definition_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`group_id\` BIGINT UNSIGNED NOT NULL,
        \`setting_key\` VARCHAR(150) NOT NULL,
        \`label\` VARCHAR(255) NOT NULL,
        \`description\` VARCHAR(1000) NULL,
        \`value_type\` ENUM(
          'string','number','boolean','enum','json',
          'string_array','number_array','datetime','duration',
          'url','email','secret'
        ) NOT NULL,
        \`constraints_json\` TEXT NULL,
        \`default_value\` TEXT NULL,
        \`is_tenant_overridable\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`is_sensitive\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`is_readonly\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`requires_restart\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`sort_order\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`is_active\` TINYINT UNSIGNED NOT NULL DEFAULT 1,
        \`created_by\` BIGINT UNSIGNED NOT NULL,
        \`updated_by\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`definition_id\`),
        UNIQUE KEY \`uq_system_setting_definitions_setting_key\` (\`setting_key\`),
        KEY \`idx_system_setting_definitions_group_id\` (\`group_id\`),
        CONSTRAINT \`fk_system_setting_definitions_group\`
          FOREIGN KEY (\`group_id\`)
          REFERENCES \`system_setting_groups\` (\`group_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`system_setting_values\` (
        \`value_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`definition_id\` BIGINT UNSIGNED NOT NULL,
        \`tenant_id\` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 = global; positive = tenant override',
        \`value_json\` TEXT NOT NULL,
        \`created_by\` BIGINT UNSIGNED NOT NULL,
        \`updated_by\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`value_id\`),
        UNIQUE KEY \`uq_system_setting_values_definition_tenant\` (\`definition_id\`, \`tenant_id\`),
        KEY \`idx_system_setting_values_definition_id\` (\`definition_id\`),
        KEY \`idx_system_setting_values_tenant_id\` (\`tenant_id\`),
        CONSTRAINT \`fk_system_setting_values_definition\`
          FOREIGN KEY (\`definition_id\`)
          REFERENCES \`system_setting_definitions\` (\`definition_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    // Starter groups (created_by = 0 system)
    await queryRunner.query(`
      INSERT INTO \`system_setting_groups\`
        (\`group_key\`, \`label\`, \`description\`, \`sort_order\`, \`is_active\`, \`created_by\`, \`updated_by\`)
      VALUES
        ('auth', 'Authentication', 'Session, MFA, and password policies', 10, 1, 0, 0),
        ('notifications', 'Notifications', 'Email/SMS and digest settings', 20, 1, 0, 0),
        ('storage', 'Storage', 'Upload limits and file policies', 30, 1, 0, 0),
        ('config_objects', 'Config Objects', 'Object designer and runner limits', 40, 1, 0, 0),
        ('branding', 'Branding', 'Logos and visual branding', 50, 1, 0, 0),
        ('limits', 'Limits', 'Quotas and rate limits', 60, 1, 0, 0),
        ('integrations', 'Integrations', 'External service endpoints', 70, 1, 0, 0),
        ('feature_flags', 'Feature Flags', 'Feature toggles', 80, 1, 0, 0)
      ON DUPLICATE KEY UPDATE \`label\` = VALUES(\`label\`)
    `);

    // Sample non-secret definitions (group ids resolved by key)
    await queryRunner.query(`
      INSERT INTO \`system_setting_definitions\`
        (\`group_id\`, \`setting_key\`, \`label\`, \`description\`, \`value_type\`,
         \`constraints_json\`, \`default_value\`, \`is_tenant_overridable\`,
         \`is_sensitive\`, \`is_readonly\`, \`requires_restart\`, \`sort_order\`,
         \`is_active\`, \`created_by\`, \`updated_by\`)
      SELECT g.\`group_id\`, v.\`setting_key\`, v.\`label\`, v.\`description\`, v.\`value_type\`,
             v.\`constraints_json\`, v.\`default_value\`, v.\`is_tenant_overridable\`,
             v.\`is_sensitive\`, v.\`is_readonly\`, v.\`requires_restart\`, v.\`sort_order\`,
             1, 0, 0
      FROM (
        SELECT 'auth' AS group_key,
          'auth.session_timeout_seconds' AS setting_key,
          'Session timeout (seconds)' AS label,
          'Idle session timeout in seconds' AS description,
          'duration' AS value_type,
          '{"min":60,"max":86400,"unit":"seconds"}' AS constraints_json,
          '3600' AS default_value,
          1 AS is_tenant_overridable,
          0 AS is_sensitive,
          0 AS is_readonly,
          0 AS requires_restart,
          10 AS sort_order
        UNION ALL
        SELECT 'notifications',
          'notifications.email_enabled',
          'Email notifications enabled',
          'Master switch for outbound email notifications',
          'boolean',
          NULL,
          'true',
          1, 0, 0, 0, 10
        UNION ALL
        SELECT 'storage',
          'storage.max_upload_bytes',
          'Max upload size (bytes)',
          'Maximum single-file upload size',
          'number',
          '{"min":1024,"max":1073741824}',
          '10485760',
          1, 0, 0, 0, 10
        UNION ALL
        SELECT 'feature_flags',
          'feature_flags.object_designer_enabled',
          'Object Designer enabled',
          'Enable Object Designer UI and authoring APIs',
          'boolean',
          NULL,
          'true',
          0, 0, 0, 0, 10
        UNION ALL
        SELECT 'branding',
          'branding.primary_color',
          'Primary brand color',
          'Hex color for primary branding',
          'string',
          '{"pattern":"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$","maxLength":7}',
          '"#1A73E8"',
          1, 0, 0, 0, 10
        UNION ALL
        SELECT 'integrations',
          'integrations.smtp_password',
          'SMTP password',
          'SMTP server password (encrypted at rest)',
          'secret',
          NULL,
          NULL,
          1, 1, 0, 0, 20
      ) AS v
      INNER JOIN \`system_setting_groups\` g ON g.\`group_key\` = v.group_key
      ON DUPLICATE KEY UPDATE \`label\` = VALUES(\`label\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`system_setting_values\``);
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`system_setting_definitions\``,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS \`system_setting_groups\``);
  }
}
