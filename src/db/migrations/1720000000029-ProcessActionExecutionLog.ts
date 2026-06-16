import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotency + audit for process-step lifecycle actions (Phase C7).
 */
export class ProcessActionExecutionLog1720000000029
  implements MigrationInterface
{
  name = 'ProcessActionExecutionLog1720000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`process_action_execution_log\` (
        \`execution_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`instance_step_action_id\` BIGINT UNSIGNED NOT NULL,
        \`step_instance_id\` BIGINT UNSIGNED NOT NULL,
        \`process_instance_id\` BIGINT UNSIGNED NOT NULL,
        \`run_on\` ENUM(
          'step_completed',
          'process_completed',
          'step_failed'
        ) NOT NULL,
        \`action_type\` ENUM(
          'emit_event',
          'send_notification',
          'update_sor_field',
          'call_webhook'
        ) NOT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'pending'
          COMMENT 'pending | succeeded | failed',
        \`result\` JSON NULL,
        \`error_message\` VARCHAR(2048) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`execution_id\`),
        UNIQUE KEY \`uq_process_action_execution_instance_action\` (
          \`instance_step_action_id\`
        ),
        KEY \`idx_process_action_execution_process\` (\`process_instance_id\`),
        KEY \`idx_process_action_execution_step\` (\`step_instance_id\`),
        CONSTRAINT \`fk_process_action_execution_instance_action\`
          FOREIGN KEY (\`instance_step_action_id\`)
          REFERENCES \`process_instance_step_actions\` (\`instance_step_action_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`process_action_execution_log\`
    `);
  }
}
