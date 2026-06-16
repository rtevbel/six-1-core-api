import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Step-level RBAC for Process Runner (E1).
 */
export class ProcessStepRequiredPermissions1720000000031
  implements MigrationInterface
{
  name = 'ProcessStepRequiredPermissions1720000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_template_steps\`
        ADD COLUMN \`required_permissions\` JSON NULL
          COMMENT 'Permission keys required to complete this step'
          AFTER \`is_optional\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_instance_steps\`
        ADD COLUMN \`required_permissions\` JSON NULL
          COMMENT 'Copied from template at instantiation'
          AFTER \`is_optional\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_instance_steps\`
        DROP COLUMN \`required_permissions\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`process_template_steps\`
        DROP COLUMN \`required_permissions\`
    `);
  }
}
