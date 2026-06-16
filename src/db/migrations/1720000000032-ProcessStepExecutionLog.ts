import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Append-only audit log for process step lifecycle transitions (Phase E2).
 */
export class ProcessStepExecutionLog1720000000032 implements MigrationInterface {
  name = 'ProcessStepExecutionLog1720000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`process_step_execution_log\` (
        \`log_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`process_instance_id\` BIGINT UNSIGNED NOT NULL,
        \`step_instance_id\` BIGINT UNSIGNED NOT NULL,
        \`tenant_id\` BIGINT UNSIGNED NOT NULL,
        \`step_order\` INT UNSIGNED NOT NULL,
        \`step_name\` VARCHAR(255) NULL,
        \`event\` ENUM(
          'step_ready',
          'step_started',
          'step_completed',
          'step_canceled',
          'step_blocked'
        ) NOT NULL,
        \`previous_status\` VARCHAR(32) NULL,
        \`new_status\` VARCHAR(32) NOT NULL,
        \`cause\` ENUM('manual', 'event', 'timer', 'system') NULL,
        \`actor_tenant_user_id\` BIGINT UNSIGNED NULL,
        \`correlation_id\` VARCHAR(128) NULL,
        \`metadata\` JSON NULL,
        \`occurred_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`log_id\`),
        KEY \`idx_process_step_execution_process\` (
          \`process_instance_id\`,
          \`occurred_at\`
        ),
        KEY \`idx_process_step_execution_step\` (
          \`step_instance_id\`,
          \`occurred_at\`
        ),
        KEY \`idx_process_step_execution_tenant\` (\`tenant_id\`),
        CONSTRAINT \`fk_process_step_execution_process\`
          FOREIGN KEY (\`process_instance_id\`)
          REFERENCES \`process_instances\` (\`process_instance_id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`fk_process_step_execution_step\`
          FOREIGN KEY (\`step_instance_id\`)
          REFERENCES \`process_instance_steps\` (\`step_instance_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`process_step_execution_log\`
    `);
  }
}
