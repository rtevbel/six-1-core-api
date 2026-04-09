import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConfigObjectStatusMappings1710000000009
  implements MigrationInterface
{
  name = 'ConfigObjectStatusMappings1710000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`config_object_status_mappings\` (
        \`config_object_status_mapping_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`config_object_id\` BIGINT UNSIGNED NOT NULL,
        \`state_key\` VARCHAR(100) NOT NULL,
        \`status_source\` ENUM('system_status', 'project_task_status', 'native_enum', 'custom') NOT NULL,
        \`status_value\` VARCHAR(100) NOT NULL,
        \`is_default\` TINYINT(1) NOT NULL DEFAULT 0,
        \`is_terminal\` TINYINT(1) NOT NULL DEFAULT 0,
        \`order_index\` INT NOT NULL DEFAULT 0,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`config_object_status_mapping_id\`),
        KEY \`cosm_config_object_id_idx\` (\`config_object_id\`),
        KEY \`cosm_lookup_status_idx\` (\`config_object_id\`, \`status_source\`, \`status_value\`),
        KEY \`cosm_lookup_state_idx\` (\`config_object_id\`, \`state_key\`),
        UNIQUE KEY \`uniq_cosm_state_status\` (\`config_object_id\`, \`state_key\`, \`status_source\`, \`status_value\`),
        CONSTRAINT \`fk_cosm_config_object\`
          FOREIGN KEY (\`config_object_id\`)
          REFERENCES \`config_objects\` (\`config_object_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`config_object_status_mappings\``);
  }
}
