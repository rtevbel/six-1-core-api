import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Template + runtime rows for process step lifecycle actions (Phase C1).
 */
export class ProcessTemplateStepActions1720000000028
  implements MigrationInterface
{
  name = 'ProcessTemplateStepActions1720000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`process_template_step_actions\` (
        \`step_action_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`process_template_step_id\` BIGINT UNSIGNED NOT NULL,
        \`action_type\` ENUM(
          'emit_event',
          'send_notification',
          'update_sor_field',
          'call_webhook'
        ) NOT NULL,
        \`run_on\` ENUM(
          'step_completed',
          'process_completed',
          'step_failed'
        ) NOT NULL,
        \`config\` JSON NOT NULL,
        \`order_index\` INT NOT NULL DEFAULT 0,
        \`is_active\` TINYINT NOT NULL DEFAULT 1,
        \`created_by\` BIGINT UNSIGNED NOT NULL,
        \`updated_by\` BIGINT UNSIGNED NULL DEFAULT 0,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`step_action_id\`),
        INDEX \`idx_ptsa_step_order\` (\`process_template_step_id\`, \`order_index\`),
        INDEX \`idx_ptsa_step_run_on\` (\`process_template_step_id\`, \`run_on\`, \`is_active\`),
        CONSTRAINT \`fk_ptsa_step\`
          FOREIGN KEY (\`process_template_step_id\`)
          REFERENCES \`process_template_steps\` (\`process_template_step_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`process_instance_step_actions\` (
        \`instance_step_action_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`step_instance_id\` BIGINT UNSIGNED NOT NULL,
        \`template_step_action_id\` BIGINT UNSIGNED NULL,
        \`action_type\` ENUM(
          'emit_event',
          'send_notification',
          'update_sor_field',
          'call_webhook'
        ) NOT NULL,
        \`run_on\` ENUM(
          'step_completed',
          'process_completed',
          'step_failed'
        ) NOT NULL,
        \`config\` JSON NOT NULL,
        \`order_index\` INT NOT NULL DEFAULT 0,
        \`is_active\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`instance_step_action_id\`),
        INDEX \`idx_pisa_step_order\` (\`step_instance_id\`, \`order_index\`),
        INDEX \`idx_pisa_step_run_on\` (\`step_instance_id\`, \`run_on\`, \`is_active\`),
        CONSTRAINT \`fk_pisa_step\`
          FOREIGN KEY (\`step_instance_id\`)
          REFERENCES \`process_instance_steps\` (\`step_instance_id\`)
          ON DELETE CASCADE,
        CONSTRAINT \`fk_pisa_template_action\`
          FOREIGN KEY (\`template_step_action_id\`)
          REFERENCES \`process_template_step_actions\` (\`step_action_id\`)
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`process_instance_step_actions\`
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`process_template_step_actions\`
    `);
  }
}
