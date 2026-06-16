import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Event-driven process start rules (P9 / checklist D1).
 */
export class ProcessStartRules1720000000030 implements MigrationInterface {
  name = 'ProcessStartRules1720000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`process_start_rules\` (
        \`rule_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`tenant_id\` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 = global; positive = tenant override',
        \`event_name\` VARCHAR(255) NOT NULL COMMENT 'Canonical six1-event.* name',
        \`filter_json\` JSON NULL COMMENT 'Optional JSON Logic filter on EventEnvelope',
        \`template_id\` BIGINT UNSIGNED NOT NULL COMMENT 'Published process template to instantiate',
        \`subject_type\` VARCHAR(64) NOT NULL COMMENT 'process_instances.subject_type',
        \`subject_id_source\` VARCHAR(255) NOT NULL COMMENT 'Dot-path on envelope or workflow_self',
        \`context_patch\` JSON NULL COMMENT 'Merged into process context; values may use { "path": "..." }',
        \`priority\` INT NOT NULL DEFAULT 100 COMMENT 'Lower runs first',
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_by\` BIGINT UNSIGNED NOT NULL,
        \`updated_by\` BIGINT UNSIGNED NULL DEFAULT 0,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`rule_id\`),
        KEY \`idx_process_start_rules_tenant_event\` (\`tenant_id\`, \`event_name\`, \`is_active\`),
        KEY \`idx_process_start_rules_event_priority\` (\`event_name\`, \`priority\`),
        CONSTRAINT \`fk_process_start_rules_template\`
          FOREIGN KEY (\`template_id\`) REFERENCES \`process_templates\` (\`process_template_id\`),
        CONSTRAINT \`fk_process_start_rules_created_by\`
          FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`user_id\`),
        CONSTRAINT \`fk_process_start_rules_updated_by\`
          FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`user_id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await queryRunner.query(`
      CREATE INDEX \`idx_process_instances_active_subject_lookup\`
        ON \`process_instances\` (
          \`tenant_id\`,
          \`subject_type\`,
          \`subject_id\`,
          \`process_template_id\`,
          \`status\`
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX \`idx_process_instances_active_subject_lookup\`
        ON \`process_instances\`
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS \`process_start_rules\``);
  }
}
