import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeConfigAuditLogsTenantNullable1710000000004
  implements MigrationInterface
{
  name = 'MakeConfigAuditLogsTenantNullable1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE config_audit_logs
        MODIFY COLUMN tenant_id BIGINT UNSIGNED NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE config_audit_logs
        MODIFY COLUMN tenant_id BIGINT UNSIGNED NOT NULL;
    `);
  }
}

