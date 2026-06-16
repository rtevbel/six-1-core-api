import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Template + instance step assignees (Phase E6).
 */
export class ProcessStepAssignees1720000000033 implements MigrationInterface {
  name = 'ProcessStepAssignees1720000000033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`process_template_step_assignees\` (
        \`step_assignee_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`process_template_step_id\` BIGINT UNSIGNED NOT NULL,
        \`tenant_user_id\` BIGINT UNSIGNED NOT NULL,
        \`assignment_order\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`created_by\` BIGINT UNSIGNED NOT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`step_assignee_id\`),
        UNIQUE KEY \`uq_template_step_assignee_user\` (
          \`process_template_step_id\`,
          \`tenant_user_id\`
        ),
        KEY \`idx_template_step_assignees_step\` (\`process_template_step_id\`),
        CONSTRAINT \`fk_template_step_assignees_step\`
          FOREIGN KEY (\`process_template_step_id\`)
          REFERENCES \`process_template_steps\` (\`process_template_step_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`process_instance_step_assignees\` (
        \`instance_step_assignee_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`step_instance_id\` BIGINT UNSIGNED NOT NULL,
        \`tenant_user_id\` BIGINT UNSIGNED NOT NULL,
        \`assignment_order\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`instance_step_assignee_id\`),
        UNIQUE KEY \`uq_instance_step_assignee_user\` (
          \`step_instance_id\`,
          \`tenant_user_id\`
        ),
        KEY \`idx_instance_step_assignees_step\` (\`step_instance_id\`),
        CONSTRAINT \`fk_instance_step_assignees_step\`
          FOREIGN KEY (\`step_instance_id\`)
          REFERENCES \`process_instance_steps\` (\`step_instance_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`process_instance_step_assignees\`
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`process_template_step_assignees\`
    `);
  }
}
