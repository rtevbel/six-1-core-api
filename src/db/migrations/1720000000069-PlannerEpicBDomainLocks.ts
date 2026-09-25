import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Epic B — Planner domain locks:
 * - status final → definitive; final_scenario_id → definitive_scenario_id
 * - schedule_scenario_versions + schedule_constraint_events
 * - planned-task planning flags / kind / baseline
 * - promote policy default definitive_only
 * - seed scheduler.read (100)
 */
export class PlannerEpicBDomainLocks1720000000069
  implements MigrationInterface
{
  name = 'PlannerEpicBDomainLocks1720000000069';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Scenario status: widen enum, migrate, narrow ---
    await queryRunner.query(`
      ALTER TABLE \`schedule_scenarios\`
      MODIFY \`status\` ENUM('draft', 'active', 'archived', 'final', 'definitive')
      NOT NULL DEFAULT 'draft'
    `);
    await queryRunner.query(`
      UPDATE \`schedule_scenarios\`
      SET \`status\` = 'definitive'
      WHERE \`status\` = 'final'
    `);
    await queryRunner.query(`
      ALTER TABLE \`schedule_scenarios\`
      MODIFY \`status\` ENUM('draft', 'active', 'archived', 'definitive')
      NOT NULL DEFAULT 'draft'
    `);

    // --- Requirement pointer rename ---
    await queryRunner.query(`
      ALTER TABLE \`scheduling_requirements\`
      CHANGE \`final_scenario_id\` \`definitive_scenario_id\`
      BIGINT UNSIGNED NULL
    `);

    // --- Promote policy default + existing rows ---
    await queryRunner.query(`
      UPDATE \`scheduling_requirements\`
      SET \`promote_policy\` = JSON_SET(
        \`promote_policy\`,
        '$.promoteFrom',
        'definitive_only'
      )
      WHERE JSON_UNQUOTE(JSON_EXTRACT(\`promote_policy\`, '$.promoteFrom'))
        = 'active_only'
         OR JSON_EXTRACT(\`promote_policy\`, '$.promoteFrom') IS NULL
    `);

    // --- Planned task thin flags (v0.5 parity) ---
    await queryRunner.query(`
      ALTER TABLE \`scenario_planned_tasks\`
      ADD COLUMN \`is_planned\` TINYINT(1) NOT NULL DEFAULT 1 AFTER \`conflict_summary\`,
      ADD COLUMN \`is_ready\` TINYINT(1) NOT NULL DEFAULT 0 AFTER \`is_planned\`,
      ADD COLUMN \`is_milestone\` TINYINT(1) NOT NULL DEFAULT 0 AFTER \`is_ready\`,
      ADD COLUMN \`planning_kind\` ENUM('task', 'external', 'milestone')
        NOT NULL DEFAULT 'task' AFTER \`is_milestone\`,
      ADD COLUMN \`baseline_start_utc\` DATETIME(6) NULL AFTER \`planning_kind\`,
      ADD COLUMN \`baseline_end_utc\` DATETIME(6) NULL AFTER \`baseline_start_utc\`,
      ADD COLUMN \`deadline_utc\` DATETIME(6) NULL AFTER \`baseline_end_utc\`
    `);

    // --- Version history (overlay only; not promote snapshots) ---
    await queryRunner.query(`
      CREATE TABLE \`schedule_scenario_versions\` (
        \`schedule_scenario_version_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`tenant_id\` BIGINT UNSIGNED NOT NULL,
        \`schedule_scenario_id\` BIGINT UNSIGNED NOT NULL,
        \`version\` INT UNSIGNED NOT NULL,
        \`summary\` VARCHAR(512) NOT NULL,
        \`content_hash\` VARCHAR(64) NOT NULL,
        \`overlay_json\` JSON NOT NULL,
        \`created_by\` BIGINT UNSIGNED NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`schedule_scenario_version_id\`),
        UNIQUE KEY \`uq_scenario_version\` (\`schedule_scenario_id\`, \`version\`),
        KEY \`idx_ssv_tenant\` (\`tenant_id\`),
        KEY \`idx_ssv_scenario_version_desc\` (\`schedule_scenario_id\`, \`version\` DESC),
        CONSTRAINT \`fk_ssv_scenario\`
          FOREIGN KEY (\`schedule_scenario_id\`)
          REFERENCES \`schedule_scenarios\` (\`schedule_scenario_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // --- Append-only constraint / resolution audit (never KPI source) ---
    await queryRunner.query(`
      CREATE TABLE \`schedule_constraint_events\` (
        \`schedule_constraint_event_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`tenant_id\` BIGINT UNSIGNED NOT NULL,
        \`scheduling_requirement_id\` BIGINT UNSIGNED NULL,
        \`schedule_scenario_id\` BIGINT UNSIGNED NULL,
        \`action\` ENUM(
          'detected',
          'applied_with_issues',
          'resolved',
          'overridden'
        ) NOT NULL,
        \`conflict_codes\` JSON NOT NULL,
        \`task_ids\` JSON NOT NULL,
        \`resource_ids\` JSON NULL,
        \`before_windows\` JSON NULL,
        \`after_windows\` JSON NULL,
        \`actor_id\` BIGINT UNSIGNED NULL,
        \`actor_type\` ENUM('human', 'system', 'ai') NOT NULL DEFAULT 'human',
        \`reason\` VARCHAR(512) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`schedule_constraint_event_id\`),
        KEY \`idx_sce_tenant_created\` (\`tenant_id\`, \`created_at\`),
        KEY \`idx_sce_scenario_created\` (\`schedule_scenario_id\`, \`created_at\`),
        KEY \`idx_sce_tenant_action\` (\`tenant_id\`, \`action\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // --- Permission: scheduler.read (was used in code, not seeded) ---
    await queryRunner.query(`
      INSERT INTO \`permissions\`
        (\`permission_id\`, \`status_id\`, \`created_by\`, \`updated_by\`, \`created_at\`, \`updated_at\`)
      SELECT 100, 1, 1, 0, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM \`permissions\` WHERE \`permission_id\` = 100
      )
    `);
    await queryRunner.query(`
      INSERT INTO \`permission_descriptions\`
        (\`permission_id\`, \`language_id\`, \`name\`, \`description\`, \`permission_group\`, \`created_at\`, \`updated_at\`)
      SELECT 100, 1, 'scheduler.read',
        'Open Planner and read scheduling scenarios', 'Scheduler',
        CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM \`permission_descriptions\`
        WHERE \`permission_id\` = 100 AND \`language_id\` = 1
      )
    `);
    await queryRunner.query(`
      UPDATE \`permission_descriptions\`
      SET \`description\` = 'Commit definitive scenario to live schedule'
      WHERE \`permission_id\` = 102 AND \`language_id\` = 1
    `);

    for (const roleId of [1, 2]) {
      await queryRunner.query(`
        INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`, \`created_at\`)
        SELECT ${roleId}, 100, CURRENT_TIMESTAMP(6) FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM \`role_permissions\`
          WHERE \`role_id\` = ${roleId} AND \`permission_id\` = 100
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`role_permissions\` WHERE \`permission_id\` = 100
    `);
    await queryRunner.query(`
      DELETE FROM \`permission_descriptions\` WHERE \`permission_id\` = 100
    `);
    await queryRunner.query(`
      DELETE FROM \`permissions\` WHERE \`permission_id\` = 100
    `);

    await queryRunner.query(`
      UPDATE \`permission_descriptions\`
      SET \`description\` = 'Promote an active scenario to live schedule'
      WHERE \`permission_id\` = 102 AND \`language_id\` = 1
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS \`schedule_constraint_events\`
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`schedule_scenario_versions\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`scenario_planned_tasks\`
      DROP COLUMN \`deadline_utc\`,
      DROP COLUMN \`baseline_end_utc\`,
      DROP COLUMN \`baseline_start_utc\`,
      DROP COLUMN \`planning_kind\`,
      DROP COLUMN \`is_milestone\`,
      DROP COLUMN \`is_ready\`,
      DROP COLUMN \`is_planned\`
    `);

    await queryRunner.query(`
      UPDATE \`scheduling_requirements\`
      SET \`promote_policy\` = JSON_SET(
        \`promote_policy\`,
        '$.promoteFrom',
        'active_only'
      )
      WHERE JSON_UNQUOTE(JSON_EXTRACT(\`promote_policy\`, '$.promoteFrom'))
        = 'definitive_only'
    `);

    await queryRunner.query(`
      ALTER TABLE \`scheduling_requirements\`
      CHANGE \`definitive_scenario_id\` \`final_scenario_id\`
      BIGINT UNSIGNED NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`schedule_scenarios\`
      MODIFY \`status\` ENUM('draft', 'active', 'archived', 'definitive', 'final')
      NOT NULL DEFAULT 'draft'
    `);
    await queryRunner.query(`
      UPDATE \`schedule_scenarios\`
      SET \`status\` = 'final'
      WHERE \`status\` = 'definitive'
    `);
    await queryRunner.query(`
      ALTER TABLE \`schedule_scenarios\`
      MODIFY \`status\` ENUM('draft', 'active', 'archived', 'final')
      NOT NULL DEFAULT 'draft'
    `);
  }
}
