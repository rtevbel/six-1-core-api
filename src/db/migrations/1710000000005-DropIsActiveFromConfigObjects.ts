import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `config_objects` lifecycle is represented by `status`; `is_active` is redundant.
 */
export class DropIsActiveFromConfigObjects1710000000005
  implements MigrationInterface
{
  name = 'DropIsActiveFromConfigObjects1710000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`config_objects\`
      DROP COLUMN \`is_active\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`config_objects\`
      ADD COLUMN \`is_active\` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1
      AFTER \`status\`
    `);

    await queryRunner.query(`
      UPDATE \`config_objects\`
      SET \`is_active\` = CASE
        WHEN \`status\` IN ('PUBLISHED', 'CONFLICT') THEN 1
        ELSE 0
      END
    `);
  }
}
