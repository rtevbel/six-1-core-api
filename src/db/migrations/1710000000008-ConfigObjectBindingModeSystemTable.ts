import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConfigObjectBindingModeSystemTable1710000000008
  implements MigrationInterface
{
  name = 'ConfigObjectBindingModeSystemTable1710000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`config_objects\`
      MODIFY COLUMN \`binding_mode\` ENUM('sor_bound', 'standalone', 'system_table')
        NOT NULL DEFAULT 'sor_bound'
        COMMENT 'sor_bound: core row + meta; standalone: config_custom_object_instances; system_table: SoR via existing APIs, no config_object_fields'
    `);
    await queryRunner.query(`
      ALTER TABLE \`config_objects\`
      MODIFY COLUMN \`sor_table_name\` VARCHAR(255) NULL
        COMMENT 'Physical SoR table; required for sor_bound and system_table; NULL for standalone'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`config_objects\`
      SET \`binding_mode\` = 'sor_bound'
      WHERE \`binding_mode\` = 'system_table'
    `);
    await queryRunner.query(`
      ALTER TABLE \`config_objects\`
      MODIFY COLUMN \`binding_mode\` ENUM('sor_bound', 'standalone')
        NOT NULL DEFAULT 'sor_bound'
        COMMENT 'sor_bound: core row + meta; standalone: instances in config_custom_object_instances'
    `);
    await queryRunner.query(`
      ALTER TABLE \`config_objects\`
      MODIFY COLUMN \`sor_table_name\` VARCHAR(255) NULL
        COMMENT 'System-of-record table; NULL when binding_mode is standalone'
    `);
  }
}
