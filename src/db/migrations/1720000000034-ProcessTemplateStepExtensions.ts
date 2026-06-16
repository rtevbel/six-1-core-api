import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Runner v2 authoring — step extensions JSON (I2).
 */
export class ProcessTemplateStepExtensions1720000000034
  implements MigrationInterface
{
  name = 'ProcessTemplateStepExtensions1720000000034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_template_steps\`
        ADD COLUMN \`step_extensions_json\` JSON NULL
          COMMENT 'Runner extensions: visibleWhen, ui, parallelGroupId, allowSkip'
          AFTER \`required_permissions\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_template_steps\`
        DROP COLUMN \`step_extensions_json\`
    `);
  }
}
