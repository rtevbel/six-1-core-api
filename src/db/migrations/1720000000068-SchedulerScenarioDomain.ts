import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Scheduler scenario domain: requirements, scenarios, planned tasks/shifts,
 * resource assignments, events, snapshots, plus scenario RBAC permissions.
 */
export class SchedulerScenarioDomain1720000000068
  implements MigrationInterface
{
  name = 'SchedulerScenarioDomain1720000000068';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`scheduling_requirements\` (
        \`scheduling_requirement_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`tenant_id\` BIGINT UNSIGNED NOT NULL,
        \`requirement_key\` VARCHAR(64) NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NULL,
        \`scope_type\` ENUM('project', 'board') NOT NULL,
        \`primary_project_id\` BIGINT UNSIGNED NULL,
        \`horizon_start_utc\` DATETIME(6) NOT NULL,
        \`horizon_end_utc\` DATETIME(6) NOT NULL,
        \`status\` ENUM('open', 'locked', 'closed') NOT NULL DEFAULT 'open',
        \`active_scenario_id\` BIGINT UNSIGNED NULL,
        \`final_scenario_id\` BIGINT UNSIGNED NULL,
        \`synced_to_live_at\` DATETIME(6) NULL,
        \`synced_scenario_revision\` INT UNSIGNED NULL,
        \`promote_policy\` JSON NOT NULL,
        \`created_by\` BIGINT UNSIGNED NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`scheduling_requirement_id\`),
        KEY \`idx_sched_req_tenant\` (\`tenant_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`scheduling_requirement_members\` (
        \`scheduling_requirement_member_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`scheduling_requirement_id\` BIGINT UNSIGNED NOT NULL,
        \`member_type\` ENUM('project', 'task') NOT NULL,
        \`member_id\` BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (\`scheduling_requirement_member_id\`),
        UNIQUE KEY \`uq_sched_req_member\` (
          \`scheduling_requirement_id\`,
          \`member_type\`,
          \`member_id\`
        ),
        KEY \`idx_sched_req_member_req\` (\`scheduling_requirement_id\`),
        CONSTRAINT \`fk_sched_req_member_requirement\`
          FOREIGN KEY (\`scheduling_requirement_id\`)
          REFERENCES \`scheduling_requirements\` (\`scheduling_requirement_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`schedule_scenarios\` (
        \`schedule_scenario_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`scheduling_requirement_id\` BIGINT UNSIGNED NOT NULL,
        \`tenant_id\` BIGINT UNSIGNED NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`notes\` TEXT NULL,
        \`status\` ENUM('draft', 'active', 'archived', 'final') NOT NULL DEFAULT 'draft',
        \`parent_scenario_id\` BIGINT UNSIGNED NULL,
        \`revision\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`based_on_live_at\` DATETIME(6) NULL,
        \`promoted_at\` DATETIME(6) NULL,
        \`promoted_by\` BIGINT UNSIGNED NULL,
        \`created_by\` BIGINT UNSIGNED NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`schedule_scenario_id\`),
        KEY \`idx_scenario_requirement\` (\`scheduling_requirement_id\`),
        KEY \`idx_scenario_tenant\` (\`tenant_id\`),
        KEY \`idx_scenario_status\` (\`status\`),
        CONSTRAINT \`fk_schedule_scenario_requirement\`
          FOREIGN KEY (\`scheduling_requirement_id\`)
          REFERENCES \`scheduling_requirements\` (\`scheduling_requirement_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`scenario_planned_tasks\` (
        \`scenario_planned_task_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`schedule_scenario_id\` BIGINT UNSIGNED NOT NULL,
        \`task_id\` BIGINT UNSIGNED NOT NULL,
        \`planned_start_utc\` DATETIME(6) NOT NULL,
        \`planned_end_utc\` DATETIME(6) NOT NULL,
        \`tz_used\` VARCHAR(50) NOT NULL DEFAULT 'UTC',
        \`priority\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
        \`task_status_id\` BIGINT UNSIGNED NULL,
        \`notes\` TEXT NULL,
        \`constraint_snapshot\` JSON NULL,
        \`conflict_summary\` JSON NULL,
        PRIMARY KEY (\`scenario_planned_task_id\`),
        UNIQUE KEY \`uq_scenario_planned_task\` (\`schedule_scenario_id\`, \`task_id\`),
        KEY \`idx_spt_scenario\` (\`schedule_scenario_id\`),
        KEY \`idx_spt_task\` (\`task_id\`),
        CONSTRAINT \`fk_scenario_planned_task_scenario\`
          FOREIGN KEY (\`schedule_scenario_id\`)
          REFERENCES \`schedule_scenarios\` (\`schedule_scenario_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`scenario_planned_shifts\` (
        \`scenario_planned_shift_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`scenario_planned_task_id\` BIGINT UNSIGNED NOT NULL,
        \`sequence_no\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`tenant_user_id\` BIGINT UNSIGNED NULL,
        \`resource_id\` BIGINT UNSIGNED NULL,
        \`planned_start_utc\` DATETIME(6) NOT NULL,
        \`planned_end_utc\` DATETIME(6) NOT NULL,
        PRIMARY KEY (\`scenario_planned_shift_id\`),
        UNIQUE KEY \`uq_scenario_planned_shift_seq\` (
          \`scenario_planned_task_id\`,
          \`sequence_no\`
        ),
        KEY \`idx_sps_planned_task\` (\`scenario_planned_task_id\`),
        CONSTRAINT \`fk_scenario_planned_shift_task\`
          FOREIGN KEY (\`scenario_planned_task_id\`)
          REFERENCES \`scenario_planned_tasks\` (\`scenario_planned_task_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`scenario_resource_assignments\` (
        \`scenario_resource_assignment_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`scenario_planned_task_id\` BIGINT UNSIGNED NOT NULL,
        \`resource_id\` BIGINT UNSIGNED NOT NULL,
        \`scenario_planned_shift_id\` BIGINT UNSIGNED NULL,
        \`assigned_start\` DATETIME(6) NOT NULL,
        \`assigned_end\` DATETIME(6) NOT NULL,
        PRIMARY KEY (\`scenario_resource_assignment_id\`),
        KEY \`idx_sra_planned_task\` (\`scenario_planned_task_id\`),
        KEY \`idx_sra_resource\` (\`resource_id\`),
        CONSTRAINT \`fk_scenario_resource_assignment_task\`
          FOREIGN KEY (\`scenario_planned_task_id\`)
          REFERENCES \`scenario_planned_tasks\` (\`scenario_planned_task_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`schedule_scenario_events\` (
        \`event_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`schedule_scenario_id\` BIGINT UNSIGNED NULL,
        \`scheduling_requirement_id\` BIGINT UNSIGNED NOT NULL,
        \`actor_user_id\` BIGINT UNSIGNED NULL,
        \`kind\` ENUM(
          'created',
          'forked',
          'updated',
          'status_changed',
          'item_moved',
          'compared',
          'promoted',
          'archived',
          'conflict_checked'
        ) NOT NULL,
        \`payload\` JSON NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`event_id\`),
        KEY \`idx_sse_scenario\` (\`schedule_scenario_id\`),
        KEY \`idx_sse_requirement\` (\`scheduling_requirement_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      CREATE TABLE \`schedule_scenario_snapshots\` (
        \`snapshot_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`schedule_scenario_id\` BIGINT UNSIGNED NOT NULL,
        \`scheduling_requirement_id\` BIGINT UNSIGNED NOT NULL,
        \`revision\` INT UNSIGNED NOT NULL,
        \`graph_json\` JSON NOT NULL,
        \`created_by\` BIGINT UNSIGNED NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`snapshot_id\`),
        KEY \`idx_sss_scenario\` (\`schedule_scenario_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Seed scenario RBAC permissions (101–103) if not already present
    await queryRunner.query(`
      INSERT INTO \`permissions\`
        (\`permission_id\`, \`status_id\`, \`created_by\`, \`updated_by\`, \`created_at\`, \`updated_at\`)
      SELECT 101, 1, 1, 0, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM \`permissions\` WHERE \`permission_id\` = 101
      )
    `);
    await queryRunner.query(`
      INSERT INTO \`permissions\`
        (\`permission_id\`, \`status_id\`, \`created_by\`, \`updated_by\`, \`created_at\`, \`updated_at\`)
      SELECT 102, 1, 1, 0, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM \`permissions\` WHERE \`permission_id\` = 102
      )
    `);
    await queryRunner.query(`
      INSERT INTO \`permissions\`
        (\`permission_id\`, \`status_id\`, \`created_by\`, \`updated_by\`, \`created_at\`, \`updated_at\`)
      SELECT 103, 1, 1, 0, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM \`permissions\` WHERE \`permission_id\` = 103
      )
    `);

    await queryRunner.query(`
      INSERT INTO \`permission_descriptions\`
        (\`permission_id\`, \`language_id\`, \`name\`, \`description\`, \`permission_group\`, \`created_at\`, \`updated_at\`)
      SELECT 101, 1, 'scheduler.scenario.manage',
        'Manage schedule scenarios and drafts', 'Scheduler',
        CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM \`permission_descriptions\`
        WHERE \`permission_id\` = 101 AND \`language_id\` = 1
      )
    `);
    await queryRunner.query(`
      INSERT INTO \`permission_descriptions\`
        (\`permission_id\`, \`language_id\`, \`name\`, \`description\`, \`permission_group\`, \`created_at\`, \`updated_at\`)
      SELECT 102, 1, 'scheduler.promote',
        'Promote an active scenario to live schedule', 'Scheduler',
        CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM \`permission_descriptions\`
        WHERE \`permission_id\` = 102 AND \`language_id\` = 1
      )
    `);
    await queryRunner.query(`
      INSERT INTO \`permission_descriptions\`
        (\`permission_id\`, \`language_id\`, \`name\`, \`description\`, \`permission_group\`, \`created_at\`, \`updated_at\`)
      SELECT 103, 1, 'scheduler.constraints.override',
        'Override hard scheduling constraints', 'Scheduler',
        CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
      FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM \`permission_descriptions\`
        WHERE \`permission_id\` = 103 AND \`language_id\` = 1
      )
    `);

    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`, \`created_at\`)
      SELECT 1, 101, CURRENT_TIMESTAMP(6) FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM \`role_permissions\` WHERE \`role_id\` = 1 AND \`permission_id\` = 101
      )
    `);
    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`, \`created_at\`)
      SELECT 1, 102, CURRENT_TIMESTAMP(6) FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM \`role_permissions\` WHERE \`role_id\` = 1 AND \`permission_id\` = 102
      )
    `);
    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`, \`created_at\`)
      SELECT 1, 103, CURRENT_TIMESTAMP(6) FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM \`role_permissions\` WHERE \`role_id\` = 1 AND \`permission_id\` = 103
      )
    `);
    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`, \`created_at\`)
      SELECT 2, 101, CURRENT_TIMESTAMP(6) FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM \`role_permissions\` WHERE \`role_id\` = 2 AND \`permission_id\` = 101
      )
    `);
    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`, \`created_at\`)
      SELECT 2, 102, CURRENT_TIMESTAMP(6) FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM \`role_permissions\` WHERE \`role_id\` = 2 AND \`permission_id\` = 102
      )
    `);
    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`, \`created_at\`)
      SELECT 2, 103, CURRENT_TIMESTAMP(6) FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1 FROM \`role_permissions\` WHERE \`role_id\` = 2 AND \`permission_id\` = 103
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`scenario_resource_assignments\`
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`scenario_planned_shifts\`
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`scenario_planned_tasks\`
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`schedule_scenario_events\`
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`schedule_scenario_snapshots\`
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`schedule_scenarios\`
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`scheduling_requirement_members\`
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`scheduling_requirements\`
    `);

    await queryRunner.query(`
      DELETE FROM \`role_permissions\`
      WHERE \`permission_id\` IN (101, 102, 103)
    `);
    await queryRunner.query(`
      DELETE FROM \`permission_descriptions\`
      WHERE \`permission_id\` IN (101, 102, 103)
    `);
    await queryRunner.query(`
      DELETE FROM \`permissions\`
      WHERE \`permission_id\` IN (101, 102, 103)
    `);
  }
}
