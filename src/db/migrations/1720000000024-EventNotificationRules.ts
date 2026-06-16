import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tenant-scoped notification rules (P2) + migration from legacy `event_listeners`.
 */
export class EventNotificationRules1720000000024 implements MigrationInterface {
  name = 'EventNotificationRules1720000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`event_notification_rules\` (
        \`rule_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`tenant_id\` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 = global default; positive = tenant override',
        \`event_name\` VARCHAR(255) NOT NULL COMMENT 'Canonical six1-event.* name',
        \`filter_json\` JSON NULL COMMENT 'Optional JSON Logic filter on EventEnvelope',
        \`channel_id\` BIGINT UNSIGNED NOT NULL,
        \`template_id\` BIGINT UNSIGNED NOT NULL,
        \`recipient_spec\` JSON NOT NULL COMMENT 'Recipient DSL — see P3',
        \`priority\` INT NOT NULL DEFAULT 100 COMMENT 'Lower runs first',
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_by\` BIGINT UNSIGNED NOT NULL,
        \`updated_by\` BIGINT UNSIGNED NULL DEFAULT 0,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`rule_id\`),
        KEY \`idx_event_notification_rules_tenant_event\` (\`tenant_id\`, \`event_name\`, \`is_active\`),
        KEY \`idx_event_notification_rules_event_priority\` (\`event_name\`, \`priority\`),
        CONSTRAINT \`fk_event_notification_rules_channel\`
          FOREIGN KEY (\`channel_id\`) REFERENCES \`notification_channels\` (\`channel_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_event_notification_rules_template\`
          FOREIGN KEY (\`template_id\`) REFERENCES \`notification_templates\` (\`template_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_event_notification_rules_created_by\`
          FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`user_id\`),
        CONSTRAINT \`fk_event_notification_rules_updated_by\`
          FOREIGN KEY (\`updated_by\`) REFERENCES \`users\` (\`user_id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await queryRunner.query(`
      INSERT INTO \`event_notification_rules\` (
        \`tenant_id\`,
        \`event_name\`,
        \`filter_json\`,
        \`channel_id\`,
        \`template_id\`,
        \`recipient_spec\`,
        \`priority\`,
        \`is_active\`,
        \`created_by\`,
        \`updated_by\`
      )
      SELECT
        0,
        e.\`name\`,
        NULL,
        el.\`channel_id\`,
        el.\`template_id\`,
        JSON_OBJECT('type', 'event_actor'),
        100,
        el.\`is_active\`,
        el.\`created_by\`,
        CASE WHEN el.\`updated_by\` = 0 THEN NULL ELSE el.\`updated_by\` END
      FROM \`event_listeners\` el
      INNER JOIN \`events\` e ON e.\`event_id\` = el.\`event_id\`
      WHERE NOT EXISTS (
        SELECT 1
          FROM \`event_notification_rules\` r
         WHERE r.\`tenant_id\` = 0
           AND r.\`event_name\` = e.\`name\`
           AND r.\`channel_id\` = el.\`channel_id\`
           AND r.\`template_id\` = el.\`template_id\`
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`event_notification_rules\``);
  }
}
