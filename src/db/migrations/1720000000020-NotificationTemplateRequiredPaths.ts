import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stores extracted Handlebars dot-paths referenced by a notification template (NV5).
 */
export class NotificationTemplateRequiredPaths1720000000020
  implements MigrationInterface
{
  name = 'NotificationTemplateRequiredPaths1720000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notification_templates\`
      ADD COLUMN \`required_paths\` JSON NULL
        COMMENT 'Handlebars dot-paths referenced by subject/message at last save'
      AFTER \`message\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notification_templates\`
      DROP COLUMN \`required_paths\`
    `);
  }
}
