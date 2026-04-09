import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConfigCustomObjectInstances1710000000007
  implements MigrationInterface
{
  name = 'ConfigCustomObjectInstances1710000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`config_custom_object_instances\` (
        \`config_custom_object_instance_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`tenant_id\`                        BIGINT UNSIGNED NOT NULL COMMENT 'Tenant that owns this instance',
        \`config_object_id\`                BIGINT UNSIGNED NOT NULL COMMENT 'Standalone config object definition',
        \`payload\`                          JSON NOT NULL COMMENT 'Dynamic field values keyed by field_key',
        \`status\`                           ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
        \`created_by\`                       BIGINT UNSIGNED NOT NULL,
        \`updated_by\`                       BIGINT UNSIGNED NULL,
        \`created_at\`                       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`                       DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`config_custom_object_instance_id\`),
        KEY \`idx_custom_instances_tenant_object\` (\`tenant_id\`, \`config_object_id\`),
        KEY \`idx_custom_instances_config_object_id\` (\`config_object_id\`),
        CONSTRAINT \`fk_custom_instances_tenant\`
          FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\` (\`tenant_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_custom_instances_config_object\`
          FOREIGN KEY (\`config_object_id\`) REFERENCES \`config_objects\` (\`config_object_id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_custom_instances_created_by\`
          FOREIGN KEY (\`created_by\`) REFERENCES \`tenant_users\` (\`tenant_user_id\`),
        CONSTRAINT \`fk_custom_instances_updated_by\`
          FOREIGN KEY (\`updated_by\`) REFERENCES \`tenant_users\` (\`tenant_user_id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE \`config_custom_object_instances\`
    `);
  }
}
