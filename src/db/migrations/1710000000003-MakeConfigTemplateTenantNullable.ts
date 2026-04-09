import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeConfigTemplateTenantNullable1710000000003
  implements MigrationInterface
{
  name = 'MakeConfigTemplateTenantNullable1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE config_template_sets
        MODIFY COLUMN tenant_id BIGINT UNSIGNED NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE config_template_sets
        MODIFY COLUMN tenant_id BIGINT UNSIGNED NOT NULL;
    `);
  }
}

