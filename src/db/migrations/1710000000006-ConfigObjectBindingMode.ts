import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConfigObjectBindingMode1710000000006 implements MigrationInterface {
  name = 'ConfigObjectBindingMode1710000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`config_objects\`
      ADD COLUMN \`binding_mode\` ENUM('sor_bound', 'standalone')
        NOT NULL DEFAULT 'sor_bound'
        COMMENT 'sor_bound: core row + meta; standalone: instances in config_custom_object_instances'
        AFTER \`object_type\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`config_objects\`
      MODIFY COLUMN \`sor_table_name\` VARCHAR(255) NULL
        COMMENT 'System-of-record table; NULL when binding_mode is standalone'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`config_objects\`
      SET \`sor_table_name\` = '_legacy_standalone'
      WHERE \`sor_table_name\` IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`config_objects\`
      MODIFY COLUMN \`sor_table_name\` VARCHAR(255) NOT NULL
        COMMENT 'System-of-record table backing this object'
    `);
    await queryRunner.query(`
      ALTER TABLE \`config_objects\`
      DROP COLUMN \`binding_mode\`
    `);
  }
}
