import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds step failure + recovery semantics (F6):
 * - `failed` status on `process_instance_steps.status`
 * - `step_failed`, `step_retry`, `step_rollback` events on `process_step_execution_log.event`
 */
export class ProcessStepFailureRetryRollback1720000000038
  implements MigrationInterface
{
  name = 'ProcessStepFailureRetryRollback1720000000038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_instance_steps\`
        MODIFY COLUMN \`status\`
          ENUM(
            'pending',
            'ready',
            'in_progress',
            'blocked',
            'completed',
            'canceled',
            'skipped',
            'failed'
          )
          NOT NULL DEFAULT 'pending'
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_step_execution_log\`
        MODIFY COLUMN \`event\`
          ENUM(
            'step_ready',
            'step_started',
            'step_completed',
            'step_canceled',
            'step_blocked',
            'step_skipped',
            'step_failed',
            'step_retry',
            'step_rollback'
          )
          NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`process_instance_steps\`
         SET \`status\` = 'blocked'
       WHERE \`status\` = 'failed'
    `);

    await queryRunner.query(`
      DELETE FROM \`process_step_execution_log\`
       WHERE \`event\` IN ('step_failed', 'step_retry', 'step_rollback')
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_instance_steps\`
        MODIFY COLUMN \`status\`
          ENUM(
            'pending',
            'ready',
            'in_progress',
            'blocked',
            'completed',
            'canceled',
            'skipped'
          )
          NOT NULL DEFAULT 'pending'
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_step_execution_log\`
        MODIFY COLUMN \`event\`
          ENUM(
            'step_ready',
            'step_started',
            'step_completed',
            'step_canceled',
            'step_blocked',
            'step_skipped'
          )
          NOT NULL
    `);
  }
}

