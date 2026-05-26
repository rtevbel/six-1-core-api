import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends step task_type for call_process / config_object and adds child-process template metadata.
 */
export class ProcessTemplateCallProcess1710000000017
  implements MigrationInterface
{
  name = 'ProcessTemplateCallProcess1710000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_template_steps\`
        MODIFY COLUMN \`task_type\`
          ENUM('manual', 'automated', 'call_process', 'config_object')
          NOT NULL DEFAULT 'manual',
        ADD COLUMN \`child_template_id\` BIGINT UNSIGNED NULL
          COMMENT 'Child process template when task_type=call_process'
          AFTER \`task_type\`,
        ADD COLUMN \`child_subject_policy\`
          ENUM('inherit', 'workflow', 'config_instance')
          NOT NULL DEFAULT 'workflow'
          AFTER \`child_template_id\`,
        ADD COLUMN \`child_context_patch\` JSON NULL
          AFTER \`child_subject_policy\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_template_steps\`
        ADD CONSTRAINT \`fk_pts_child_template\`
          FOREIGN KEY (\`child_template_id\`)
          REFERENCES \`process_templates\` (\`process_template_id\`)
          ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_instance_steps\`
        MODIFY COLUMN \`task_type\`
          ENUM('manual', 'automated', 'call_process', 'config_object')
          NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_template_steps\`
        DROP FOREIGN KEY \`fk_pts_child_template\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_template_steps\`
        DROP COLUMN \`child_context_patch\`,
        DROP COLUMN \`child_subject_policy\`,
        DROP COLUMN \`child_template_id\`,
        MODIFY COLUMN \`task_type\`
          ENUM('manual', 'automated')
          NOT NULL DEFAULT 'manual'
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_instance_steps\`
        MODIFY COLUMN \`task_type\`
          ENUM('manual', 'automated')
          NOT NULL
    `);
  }
}
