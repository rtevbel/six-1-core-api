import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Optional JSON Schema for process instance context at start (I6).
 */
export class ProcessTemplateContextSchema1720000000035
  implements MigrationInterface
{
  name = 'ProcessTemplateContextSchema1720000000035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_templates\`
        ADD COLUMN \`context_schema\` JSON NULL
          COMMENT 'Optional JSON Schema for process_instances.context at start'
          AFTER \`status\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_templates\`
        DROP COLUMN \`context_schema\`
    `);
  }
}
