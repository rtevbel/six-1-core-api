import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Configurable platform actions and bindings (P6).
 */
export class PlatformActions1720000000025 implements MigrationInterface {
  name = 'PlatformActions1720000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`platform_actions\` (
        \`action_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`tenant_id\` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 = global',
        \`name\` VARCHAR(255) NOT NULL,
        \`description\` VARCHAR(512) NULL,
        \`action_type\` VARCHAR(64) NOT NULL COMMENT 'emit_event | send_notification',
        \`config\` JSON NOT NULL,
        \`priority\` INT NOT NULL DEFAULT 100,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_by\` BIGINT UNSIGNED NOT NULL,
        \`updated_by\` BIGINT UNSIGNED NULL DEFAULT 0,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`action_id\`),
        KEY \`idx_platform_actions_tenant_type\` (\`tenant_id\`, \`action_type\`, \`is_active\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`action_bindings\` (
        \`binding_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`tenant_id\` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 = global',
        \`on_event_name\` VARCHAR(255) NOT NULL,
        \`action_id\` BIGINT UNSIGNED NOT NULL,
        \`filter_json\` JSON NULL,
        \`priority\` INT NOT NULL DEFAULT 100,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_by\` BIGINT UNSIGNED NOT NULL,
        \`updated_by\` BIGINT UNSIGNED NULL DEFAULT 0,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`binding_id\`),
        KEY \`idx_action_bindings_tenant_event\` (\`tenant_id\`, \`on_event_name\`, \`is_active\`),
        CONSTRAINT \`fk_action_bindings_action\`
          FOREIGN KEY (\`action_id\`) REFERENCES \`platform_actions\` (\`action_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`action_execution_log\` (
        \`execution_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`event_record_id\` BIGINT UNSIGNED NOT NULL,
        \`action_id\` BIGINT UNSIGNED NOT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT 'pending | succeeded | failed',
        \`result\` JSON NULL,
        \`error_message\` VARCHAR(2048) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`execution_id\`),
        UNIQUE KEY \`uq_action_execution_record_action\` (\`event_record_id\`, \`action_id\`),
        KEY \`idx_action_execution_event_record\` (\`event_record_id\`),
        CONSTRAINT \`fk_action_execution_event_record\`
          FOREIGN KEY (\`event_record_id\`) REFERENCES \`platform_event_records\` (\`record_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_action_execution_action\`
          FOREIGN KEY (\`action_id\`) REFERENCES \`platform_actions\` (\`action_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`action_execution_log\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`action_bindings\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`platform_actions\``);
  }
}
