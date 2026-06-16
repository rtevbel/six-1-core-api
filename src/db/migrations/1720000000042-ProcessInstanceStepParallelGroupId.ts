import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Runner v3 (G1) — denormalize `parallelGroupId` onto instance steps for group barriers.
 */
export class ProcessInstanceStepParallelGroupId1720000000042
  implements MigrationInterface
{
  name = 'ProcessInstanceStepParallelGroupId1720000000042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_instance_steps\`
        ADD COLUMN \`parallel_group_id\` VARCHAR(64) NULL
          COMMENT 'Runner v3: parallel group id snapshot from step_extensions_json.parallelGroupId'
          AFTER \`step_extensions_json\`
    `);

    await queryRunner.query(`
      CREATE INDEX \`idx_process_instance_steps_group\`
        ON \`process_instance_steps\` (\`process_instance_id\`, \`step_order\`, \`parallel_group_id\`)
    `);

    // Best-effort backfill from JSON snapshot (MySQL JSON functions).
    // Safe no-op when JSON is null or missing `parallelGroupId`.
    await queryRunner.query(`
      UPDATE \`process_instance_steps\`
         SET \`parallel_group_id\` =
           NULLIF(
             TRIM(
               JSON_UNQUOTE(JSON_EXTRACT(\`step_extensions_json\`, '$.parallelGroupId'))
             ),
             ''
           )
       WHERE \`parallel_group_id\` IS NULL
         AND \`step_extensions_json\` IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX \`idx_process_instance_steps_group\` ON \`process_instance_steps\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_instance_steps\`
        DROP COLUMN \`parallel_group_id\`
    `);
  }
}

