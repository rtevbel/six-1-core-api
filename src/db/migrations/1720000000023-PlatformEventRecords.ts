import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Durable platform event audit log (P1).
 * Separate from `event_logs` (notification pipeline).
 */
export class PlatformEventRecords1720000000023 implements MigrationInterface {
  name = 'PlatformEventRecords1720000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`platform_event_records\` (
        \`record_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`event_name\` VARCHAR(255) NOT NULL COMMENT 'Canonical event name at emit time',
        \`tenant_id\` BIGINT UNSIGNED NULL COMMENT 'Tenant scope when provided on envelope',
        \`correlation_id\` VARCHAR(64) NULL COMMENT 'Workflow correlation UUID',
        \`causation_id\` VARCHAR(64) NULL COMMENT 'Parent platform_event_records.record_id or external ref',
        \`entity_type\` VARCHAR(128) NULL,
        \`entity_id\` BIGINT UNSIGNED NULL,
        \`payload\` JSON NULL COMMENT 'Event data payload snapshot',
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'recorded' COMMENT 'recorded | dispatched | failed',
        \`occurred_at\` DATETIME(6) NOT NULL COMMENT 'Business time from envelope',
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`record_id\`),
        KEY \`idx_platform_event_records_correlation\` (\`correlation_id\`),
        KEY \`idx_platform_event_records_tenant_occurred\` (\`tenant_id\`, \`occurred_at\`),
        KEY \`idx_platform_event_records_event_name\` (\`event_name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`platform_event_records\``);
  }
}
