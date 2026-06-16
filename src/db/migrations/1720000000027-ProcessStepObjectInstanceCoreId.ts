import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Core-linked process step object bindings (Phase 5b).
 */
export class ProcessStepObjectInstanceCoreId1720000000027
  implements MigrationInterface
{
  name = 'ProcessStepObjectInstanceCoreId1720000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_instance_step_object_instances\`
        ADD COLUMN \`core_id\` BIGINT UNSIGNED NULL
          AFTER \`config_custom_object_instance_id\`,
        ADD INDEX \`idx_pisoi_core_lookup\` (\`config_object_id\`, \`core_id\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_instance_step_object_instances\`
        DROP INDEX \`idx_pisoi_core_lookup\`,
        DROP COLUMN \`core_id\`
    `);
  }
}
