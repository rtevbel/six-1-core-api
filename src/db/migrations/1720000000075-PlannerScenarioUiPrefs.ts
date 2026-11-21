import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Week 9 — persist Planner UI prefs (lens + settings) on the scenario.
 */
export class PlannerScenarioUiPrefs1720000000075
  implements MigrationInterface
{
  name = 'PlannerScenarioUiPrefs1720000000075';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`schedule_scenarios\`
      ADD COLUMN \`ui_prefs\` JSON NULL AFTER \`notes\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`schedule_scenarios\`
      DROP COLUMN \`ui_prefs\`
    `);
  }
}
