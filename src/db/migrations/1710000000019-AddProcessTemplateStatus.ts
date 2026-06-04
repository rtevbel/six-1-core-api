import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds lifecycle status to process_templates (aligned with config_template_sets).
 */
export class AddProcessTemplateStatus1710000000019
  implements MigrationInterface
{
  name = 'AddProcessTemplateStatus1710000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_templates\`
      ADD COLUMN \`status\` ENUM('DRAFT','PUBLISHED','ARCHIVED','CONFLICT') NOT NULL DEFAULT 'DRAFT'
        COMMENT 'Lifecycle status of the process template'
      AFTER \`updated_by\`
    `);

    await queryRunner.query(`
      UPDATE \`process_templates\`
      SET \`status\` = 'PUBLISHED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_templates\`
      DROP COLUMN \`status\`
    `);
  }
}
