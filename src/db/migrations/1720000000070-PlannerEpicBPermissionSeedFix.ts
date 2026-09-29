import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Epic B follow-up — fix Planner RBAC seeds.
 *
 * 0068/0069 assumed permission_ids 100–103, which already map to
 * reports.manage / config.* on real DBs. Seeds were skipped; 0069 also
 * overwrote config.read's description by id. This migration:
 * - restores config.read description
 * - ensures scheduler.scenario.manage / promote / constraints.override
 *   exist by name (ids 117–119)
 * - refreshes scheduler.read description for Planner
 * - grants roles 1–2 the three scenario permissions by name
 */
export class PlannerEpicBPermissionSeedFix1720000000070
  implements MigrationInterface
{
  name = 'PlannerEpicBPermissionSeedFix1720000000070';

  private readonly seeds: Array<{
    id: number;
    name: string;
    description: string;
  }> = [
    {
      id: 117,
      name: 'scheduler.scenario.manage',
      description: 'Manage schedule scenarios and drafts',
    },
    {
      id: 118,
      name: 'scheduler.promote',
      description: 'Commit definitive scenario to live schedule',
    },
    {
      id: 119,
      name: 'scheduler.constraints.override',
      description: 'Override hard scheduling constraints',
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`permission_descriptions\`
      SET \`description\` = 'Manage config'
      WHERE \`name\` = 'config.read'
        AND \`language_id\` = 1
        AND \`description\` = 'Commit definitive scenario to live schedule'
    `);

    await queryRunner.query(`
      UPDATE \`permission_descriptions\`
      SET \`description\` = 'Open Planner and read scheduling scenarios'
      WHERE \`name\` = 'scheduler.read'
        AND \`language_id\` = 1
    `);

    for (const seed of this.seeds) {
      await queryRunner.query(
        `
        INSERT INTO \`permissions\`
          (\`permission_id\`, \`status_id\`, \`created_by\`, \`updated_by\`, \`created_at\`, \`updated_at\`)
        SELECT ?, 1, 1, 0, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM \`permission_descriptions\`
          WHERE \`name\` = ? AND \`language_id\` = 1
        )
          AND NOT EXISTS (
            SELECT 1 FROM \`permissions\` WHERE \`permission_id\` = ?
          )
        `,
        [seed.id, seed.name, seed.id],
      );

      await queryRunner.query(
        `
        INSERT INTO \`permission_descriptions\`
          (\`permission_id\`, \`language_id\`, \`name\`, \`description\`,
           \`permission_group\`, \`created_at\`, \`updated_at\`)
        SELECT p.\`permission_id\`, 1, ?, ?, 'Scheduler',
          CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
        FROM \`permissions\` p
        WHERE p.\`permission_id\` = ?
          AND NOT EXISTS (
            SELECT 1 FROM \`permission_descriptions\`
            WHERE \`name\` = ? AND \`language_id\` = 1
          )
        `,
        [seed.name, seed.description, seed.id, seed.name],
      );

      // If row already existed under a different id, refresh description.
      await queryRunner.query(
        `
        UPDATE \`permission_descriptions\`
        SET \`description\` = ?, \`permission_group\` = 'Scheduler'
        WHERE \`name\` = ? AND \`language_id\` = 1
        `,
        [seed.description, seed.name],
      );

      for (const roleId of [1, 2]) {
        await queryRunner.query(
          `
          INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`, \`created_at\`)
          SELECT ?, pd.\`permission_id\`, CURRENT_TIMESTAMP(6)
          FROM \`permission_descriptions\` pd
          WHERE pd.\`name\` = ? AND pd.\`language_id\` = 1
            AND NOT EXISTS (
              SELECT 1 FROM \`role_permissions\` rp
              WHERE rp.\`role_id\` = ? AND rp.\`permission_id\` = pd.\`permission_id\`
            )
          `,
          [roleId, seed.name, roleId],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`permission_descriptions\`
      SET \`description\` = 'View scheduled tasks'
      WHERE \`name\` = 'scheduler.read' AND \`language_id\` = 1
    `);

    for (const seed of this.seeds) {
      await queryRunner.query(
        `
        DELETE rp FROM \`role_permissions\` rp
        INNER JOIN \`permission_descriptions\` pd
          ON pd.\`permission_id\` = rp.\`permission_id\`
        WHERE pd.\`name\` = ? AND pd.\`language_id\` = 1
          AND rp.\`role_id\` IN (1, 2)
        `,
        [seed.name],
      );
      await queryRunner.query(
        `
        DELETE FROM \`permission_descriptions\`
        WHERE \`name\` = ? AND \`language_id\` = 1
          AND \`permission_id\` = ?
        `,
        [seed.name, seed.id],
      );
      await queryRunner.query(
        `
        DELETE FROM \`permissions\`
        WHERE \`permission_id\` = ?
          AND NOT EXISTS (
            SELECT 1 FROM \`permission_descriptions\`
            WHERE \`permission_id\` = ?
          )
        `,
        [seed.id, seed.id],
      );
    }
  }
}
