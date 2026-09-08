import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enforces at most one active parent schedule per task via unique active_guard.
 * Deactivates duplicate active parents (keeps newest) before adding the index.
 */
export class UniqueActiveParentSchedule1720000000067
  implements MigrationInterface
{
  name = 'UniqueActiveParentSchedule1720000000067';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Keep newest active parent per task; deactivate older duplicates
    await queryRunner.query(`
      UPDATE scheduled_tasks s
      INNER JOIN (
        SELECT task_id, MAX(scheduled_task_id) AS keep_id
        FROM scheduled_tasks
        WHERE is_active = 1 AND parent_scheduled_task_id IS NULL AND deleted_at IS NULL
        GROUP BY task_id
        HAVING COUNT(*) > 1
      ) d ON s.task_id = d.task_id
      SET s.is_active = 0, s.status = 'cancelled'
      WHERE s.is_active = 1
        AND s.parent_scheduled_task_id IS NULL
        AND s.scheduled_task_id <> d.keep_id
    `);

    // Drop non-unique index if present, then add unique
    await queryRunner.query(`
      SET @idx_exists := (
        SELECT COUNT(1)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'scheduled_tasks'
          AND index_name = 'uq_active_per_task'
      )
    `);
    await queryRunner.query(`
      SET @sql := IF(
        @idx_exists > 0,
        'ALTER TABLE scheduled_tasks DROP INDEX uq_active_per_task',
        'SELECT 1'
      )
    `);
    await queryRunner.query(`PREPARE stmt FROM @sql`);
    await queryRunner.query(`EXECUTE stmt`);
    await queryRunner.query(`DEALLOCATE PREPARE stmt`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_active_per_task ON scheduled_tasks (active_guard)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE scheduled_tasks DROP INDEX uq_active_per_task
    `);
    await queryRunner.query(`
      CREATE INDEX uq_active_per_task ON scheduled_tasks (active_guard)
    `);
  }
}
