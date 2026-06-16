import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Runner v3 (G3) — collaboration locks on process steps.
 */
export class ProcessStepLocks1720000000043 implements MigrationInterface {
  name = 'ProcessStepLocks1720000000043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`process_step_locks\` (
        \`process_step_lock_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`step_instance_id\` BIGINT UNSIGNED NOT NULL,
        \`tenant_user_id\` BIGINT UNSIGNED NOT NULL,
        \`expires_at\` DATETIME NOT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`process_step_lock_id\`),
        UNIQUE KEY \`uk_process_step_locks_step\` (\`step_instance_id\`),
        KEY \`idx_process_step_locks_expires\` (\`expires_at\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`process_step_locks\``);
  }
}

