import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 8 — audit trail for generic email verification RPC attempts.
 */
export class ConfigObjectVerificationAuditLogs1720000000053
  implements MigrationInterface
{
  name = 'ConfigObjectVerificationAuditLogs1720000000053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`config_object_verification_audit_logs\` (
        \`config_object_verification_audit_log_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`object_type\` VARCHAR(100) NOT NULL,
        \`tenant_id\` BIGINT UNSIGNED NULL,
        \`core_id\` BIGINT UNSIGNED NULL,
        \`outcome\` ENUM('success', 'failure', 'rate_limited') NOT NULL,
        \`failure_reason\` VARCHAR(255) NULL,
        \`token_fingerprint\` CHAR(16) NOT NULL,
        \`client_key\` VARCHAR(255) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`config_object_verification_audit_log_id\`),
        KEY \`idx_verification_audit_created_at\` (\`created_at\`),
        KEY \`idx_verification_audit_object_outcome\` (\`object_type\`, \`outcome\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`config_object_verification_audit_logs\`
    `);
  }
}
