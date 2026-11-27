import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Week 11 — drawer / phase dock gap fields.
 * - planning_phase + ready_pct on overlay planned tasks
 * - process_runs JSON on schedule_scenarios (drawer Actions Panel)
 */
export class PlannerDrawerPhaseDock1720000000076
  implements MigrationInterface
{
  name = 'PlannerDrawerPhaseDock1720000000076';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`scenario_planned_tasks\`
      ADD COLUMN \`planning_phase\` VARCHAR(16) NULL DEFAULT 'plan' AFTER \`planning_kind\`,
      ADD COLUMN \`ready_pct\` TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER \`is_ready\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`schedule_scenarios\`
      ADD COLUMN \`process_runs\` JSON NULL AFTER \`ui_prefs\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`schedule_scenarios\`
      DROP COLUMN \`process_runs\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`scenario_planned_tasks\`
      DROP COLUMN \`ready_pct\`,
      DROP COLUMN \`planning_phase\`
    `);
  }
}
