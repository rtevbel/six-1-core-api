import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Links scheduled_tasks to dynamic process instances (Tier 1 pilot).
 */
export class ScheduledTaskProcessInstance1710000000018
  implements MigrationInterface
{
  name = 'ScheduledTaskProcessInstance1710000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`scheduled_tasks\`
        ADD COLUMN \`process_instance_id\` BIGINT UNSIGNED NULL
          COMMENT 'Dynamic process instance for this schedule'
          AFTER \`task_id\`,
        ADD INDEX \`idx_scheduled_tasks_process_instance\` (\`process_instance_id\`)
    `);

    await queryRunner.query(`
      ALTER TABLE \`scheduled_tasks\`
        ADD CONSTRAINT \`fk_scheduled_tasks_process_instance\`
          FOREIGN KEY (\`process_instance_id\`)
          REFERENCES \`process_instances\` (\`process_instance_id\`)
          ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`scheduled_tasks\`
        DROP FOREIGN KEY \`fk_scheduled_tasks_process_instance\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`scheduled_tasks\`
        DROP INDEX \`idx_scheduled_tasks_process_instance\`,
        DROP COLUMN \`process_instance_id\`
    `);
  }
}
