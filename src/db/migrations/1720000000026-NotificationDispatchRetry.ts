import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P8 — retry metadata on notifications and dead-letter on notification_logs.
 */
export class NotificationDispatchRetry1720000000026
  implements MigrationInterface
{
  name = 'NotificationDispatchRetry1720000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
        ADD COLUMN \`send_attempts\` INT UNSIGNED NOT NULL DEFAULT 0
          COMMENT 'Outbound send attempts (P8)' AFTER \`status\`,
        ADD COLUMN \`next_retry_at\` DATETIME(6) NULL DEFAULT NULL
          COMMENT 'Earliest retry time after failed send (P8)' AFTER \`send_attempts\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`notification_logs\`
        MODIFY COLUMN \`status\` ENUM('pending', 'sent', 'failed', 'dead_letter')
          NOT NULL COMMENT 'Status of the notification attempt'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`notification_logs\` SET \`status\` = 'failed' WHERE \`status\` = 'dead_letter'
    `);

    await queryRunner.query(`
      ALTER TABLE \`notification_logs\`
        MODIFY COLUMN \`status\` ENUM('pending', 'sent', 'failed')
          NOT NULL COMMENT 'Status of the notification attempt'
    `);

    await queryRunner.query(`
      ALTER TABLE \`notifications\`
        DROP COLUMN \`next_retry_at\`,
        DROP COLUMN \`send_attempts\`
    `);
  }
}
