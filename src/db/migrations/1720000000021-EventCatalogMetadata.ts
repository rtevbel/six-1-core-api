import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Platform event catalog metadata (P0.1).
 * Adds category, schema version, payload JSON Schema, and system-managed flag.
 */
export class EventCatalogMetadata1720000000021 implements MigrationInterface {
  name = 'EventCatalogMetadata1720000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`events\`
      ADD COLUMN \`category\` VARCHAR(64) NULL
        COMMENT 'Catalog grouping: process, domain, requirement, etc.'
      AFTER \`description\`,
      ADD COLUMN \`schema_version\` VARCHAR(32) NOT NULL DEFAULT '1.0'
        COMMENT 'Payload contract version for this event'
      AFTER \`category\`,
      ADD COLUMN \`payload_schema\` JSON NULL
        COMMENT 'Optional JSON Schema describing event data payload'
      AFTER \`schema_version\`,
      ADD COLUMN \`is_system\` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0
        COMMENT 'System-managed catalog entry; not user-deletable in admin UI'
      AFTER \`payload_schema\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`events\`
      DROP COLUMN \`is_system\`,
      DROP COLUMN \`payload_schema\`,
      DROP COLUMN \`schema_version\`,
      DROP COLUMN \`category\`
    `);
  }
}
