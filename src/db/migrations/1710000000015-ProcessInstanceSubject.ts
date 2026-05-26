import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds job anchor columns to process_instances and backfills existing rows.
 *
 * - Project-linked instances → subject_type=project, subject_id=project_id
 * - Orphans → subject_type=workflow, subject_id=process_instance_id (self-subject)
 */
export class ProcessInstanceSubject1710000000015 implements MigrationInterface {
  name = 'ProcessInstanceSubject1710000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`process_instances\`
        ADD COLUMN \`subject_type\` VARCHAR(64) NULL
          COMMENT 'Job anchor type: project, workflow, config_custom_object_instance, etc.'
          AFTER \`tenant_id\`,
        ADD COLUMN \`subject_id\` BIGINT UNSIGNED NULL
          COMMENT 'PK of the subject entity (or process_instance_id for workflow self-subject)'
          AFTER \`subject_type\`,
        ADD COLUMN \`subject_metadata\` JSON NULL
          COMMENT 'Optional snapshot: objectType, configObjectId, displayLabel, sor coreId, etc.'
          AFTER \`subject_id\`
    `);

    await queryRunner.query(`
      UPDATE \`process_instances\` pi
      INNER JOIN (
        SELECT \`process_instance_id\`, MIN(\`project_id\`) AS \`project_id\`
        FROM \`projects\`
        WHERE \`process_instance_id\` IS NOT NULL
        GROUP BY \`process_instance_id\`
      ) p ON p.\`process_instance_id\` = pi.\`process_instance_id\`
      SET
        pi.\`subject_type\` = 'project',
        pi.\`subject_id\` = p.\`project_id\`
    `);

    await queryRunner.query(`
      UPDATE \`process_instances\`
      SET
        \`subject_type\` = 'workflow',
        \`subject_id\` = \`process_instance_id\`
      WHERE \`subject_type\` IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_instances\`
        MODIFY COLUMN \`subject_type\` VARCHAR(64) NOT NULL,
        MODIFY COLUMN \`subject_id\` BIGINT UNSIGNED NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX \`idx_process_instances_tenant_subject\`
        ON \`process_instances\` (\`tenant_id\`, \`subject_type\`, \`subject_id\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX \`idx_process_instances_tenant_subject\`
        ON \`process_instances\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`process_instances\`
        DROP COLUMN \`subject_metadata\`,
        DROP COLUMN \`subject_id\`,
        DROP COLUMN \`subject_type\`
    `);
  }
}
