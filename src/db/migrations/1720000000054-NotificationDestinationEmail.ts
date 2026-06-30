import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Optional direct email destination for notifications to non-platform recipients (e.g. customers).
 */
export class NotificationDestinationEmail1720000000054
  implements MigrationInterface
{
  name = 'NotificationDestinationEmail1720000000054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      ADD COLUMN \`destination_email\` VARCHAR(255) NULL
        COMMENT 'Direct email when recipient is not a platform user'
        AFTER \`user_id\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      DROP COLUMN \`destination_email\`
    `);
  }
}
