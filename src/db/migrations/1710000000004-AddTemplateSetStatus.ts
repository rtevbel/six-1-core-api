import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateSetStatus1710000000004 implements MigrationInterface {
  name = 'AddTemplateSetStatus1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`config_template_sets\`
      ADD COLUMN \`status\` ENUM('DRAFT','PUBLISHED','ARCHIVED','CONFLICT') NOT NULL DEFAULT 'DRAFT' COMMENT 'Lifecycle status of the template set'
      AFTER \`description\`;
    `);

    await queryRunner.query(`
      UPDATE \`config_template_sets\`
      SET \`status\` = CASE
        WHEN \`is_active\` = 1 THEN 'PUBLISHED'
        ELSE 'DRAFT'
      END;
    `);

    await queryRunner.query(`
      ALTER TABLE \`config_template_sets\`
      DROP COLUMN \`is_active\`;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`config_template_sets\`
      ADD COLUMN \`is_active\` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1
      AFTER \`description\`;
    `);

    await queryRunner.query(`
      UPDATE \`config_template_sets\`
      SET \`is_active\` = CASE
        WHEN \`status\` IN ('PUBLISHED','CONFLICT') THEN 1
        ELSE 0
      END;
    `);

    await queryRunner.query(`
      ALTER TABLE \`config_template_sets\`
      DROP COLUMN \`status\`;
    `);
  }
}

