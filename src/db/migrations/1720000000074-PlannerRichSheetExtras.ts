import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Week 8 — rich task sheet extras on scenario overlay planned tasks.
 * Stores skills / partners / equipment / materials / predecessors as JSON.
 */
export class PlannerRichSheetExtras1720000000074
  implements MigrationInterface
{
  name = 'PlannerRichSheetExtras1720000000074';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`scenario_planned_tasks\`
      ADD COLUMN \`sheet_extras\` JSON NULL AFTER \`deadline_utc\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`scenario_planned_tasks\`
      DROP COLUMN \`sheet_extras\`
    `);
  }
}
