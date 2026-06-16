import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Runner v2 (F0.2) — snapshot template step extensions on instance steps at instantiation.
 */
export class ProcessInstanceStepExtensions1720000000036
  implements MigrationInterface
{
  name = 'ProcessInstanceStepExtensions1720000000036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_instance_steps\`
        ADD COLUMN \`step_extensions_json\` JSON NULL
          COMMENT 'Runner extensions copied from template at instantiation'
          AFTER \`required_permissions\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_instance_steps\`
        DROP COLUMN \`step_extensions_json\`
    `);
  }
}
