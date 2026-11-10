import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Week 7 — Option A Manage planning draft master.
 * Scenario-scoped records until Commit to live (later slice).
 */
export class PlannerManageRecords1720000000071 implements MigrationInterface {
  name = 'PlannerManageRecords1720000000071';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`schedule_scenario_manage_records\` (
        \`schedule_scenario_manage_record_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`tenant_id\` BIGINT UNSIGNED NOT NULL,
        \`schedule_scenario_id\` BIGINT UNSIGNED NOT NULL,
        \`category\` ENUM(
          'project',
          'person',
          'team',
          'partner',
          'equipment',
          'material'
        ) NOT NULL,
        \`record_key\` CHAR(36) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`parent_record_key\` CHAR(36) NULL,
        \`linked_master_id\` BIGINT UNSIGNED NULL,
        \`attrs\` JSON NOT NULL,
        \`created_by\` BIGINT UNSIGNED NULL,
        \`updated_by\` BIGINT UNSIGNED NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`schedule_scenario_manage_record_id\`),
        UNIQUE KEY \`uq_ssmr_scenario_record_key\`
          (\`schedule_scenario_id\`, \`record_key\`),
        KEY \`idx_ssmr_tenant_scenario\` (\`tenant_id\`, \`schedule_scenario_id\`),
        KEY \`idx_ssmr_scenario_category\` (\`schedule_scenario_id\`, \`category\`),
        CONSTRAINT \`fk_ssmr_scenario\`
          FOREIGN KEY (\`schedule_scenario_id\`)
          REFERENCES \`schedule_scenarios\` (\`schedule_scenario_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`schedule_scenario_manage_records\`
    `);
  }
}
