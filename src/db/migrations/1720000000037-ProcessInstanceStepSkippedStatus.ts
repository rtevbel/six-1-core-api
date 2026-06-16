import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `skipped` step status for deferred hidden steps (Runner v2 / F3).
 */
export class ProcessInstanceStepSkippedStatus1720000000037
  implements MigrationInterface
{
  name = 'ProcessInstanceStepSkippedStatus1720000000037';

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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`process_instance_steps\`
         SET \`status\` = 'completed'
       WHERE \`status\` = 'skipped'
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
            'canceled'
          )
          NOT NULL DEFAULT 'pending'
    `);

    await queryRunner.query(`
      DELETE FROM \`process_step_execution_log\`
       WHERE \`event\` = 'step_skipped'
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_step_execution_log\`
        MODIFY COLUMN \`event\`
          ENUM(
            'step_ready',
            'step_started',
            'step_completed',
            'step_canceled',
            'step_blocked'
          )
          NOT NULL
    `);
  }
}
