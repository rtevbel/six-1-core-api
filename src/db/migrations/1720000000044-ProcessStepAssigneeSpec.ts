import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Template + instance assignee_spec (Track A — runtime assignee resolution).
 * Backfills explicit_user_ids from legacy process_template_step_assignees rows.
 */
export class ProcessStepAssigneeSpec1720000000044 implements MigrationInterface {
  name = 'ProcessStepAssigneeSpec1720000000044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('process_template_steps', 'assignee_spec'))) {
      await queryRunner.query(`
        ALTER TABLE \`process_template_steps\`
          ADD COLUMN \`assignee_spec\` JSON NULL
            COMMENT 'Runtime assignee resolution spec (RecipientSpec shape)'
            AFTER \`step_extensions_json\`
      `);
    }

    if (!(await queryRunner.hasColumn('process_instance_steps', 'assignee_spec'))) {
      await queryRunner.query(`
        ALTER TABLE \`process_instance_steps\`
          ADD COLUMN \`assignee_spec\` JSON NULL
            COMMENT 'Snapshot of template assignee_spec at instantiation'
            AFTER \`step_extensions_json\`
      `);
    }

    await queryRunner.query(`
      UPDATE \`process_template_steps\` pts
      INNER JOIN (
        SELECT ptsa.process_template_step_id,
               JSON_OBJECT(
                 'type', 'explicit_user_ids',
                 'userIds', CAST(
                   CONCAT(
                     '[',
                     GROUP_CONCAT(
                       tu.user_id
                       ORDER BY ptsa.assignment_order ASC, ptsa.step_assignee_id ASC
                       SEPARATOR ','
                     ),
                     ']'
                   ) AS JSON
                 )
               ) AS spec
          FROM \`process_template_step_assignees\` ptsa
          INNER JOIN \`tenant_users\` tu
            ON tu.tenant_user_id = ptsa.tenant_user_id
         GROUP BY ptsa.process_template_step_id
      ) agg ON agg.process_template_step_id = pts.process_template_step_id
         SET pts.assignee_spec = agg.spec
       WHERE pts.assignee_spec IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('process_instance_steps', 'assignee_spec')) {
      await queryRunner.query(`
        ALTER TABLE \`process_instance_steps\`
          DROP COLUMN \`assignee_spec\`
      `);
    }
    if (await queryRunner.hasColumn('process_template_steps', 'assignee_spec')) {
      await queryRunner.query(`
        ALTER TABLE \`process_template_steps\`
          DROP COLUMN \`assignee_spec\`
      `);
    }
  }
}
