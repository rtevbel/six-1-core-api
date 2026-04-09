import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResourceMeta1710000000001 implements MigrationInterface {
  name = 'AddResourceMeta1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`resource_meta\` (
        \`resource_meta_id\` BIGINT UNSIGNED AUTO_INCREMENT,
        \`resource_id\`      BIGINT UNSIGNED NOT NULL COMMENT 'Linked resource',
        \`meta_json\`        JSON NOT NULL COMMENT 'Dynamic field values keyed by field_key',
        \`created_at\`       DATETIME NOT NULL DEFAULT current_timestamp(),
        \`updated_at\`       TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (\`resource_meta_id\`),
        UNIQUE KEY \`uq_resource_meta_resource_id\` (\`resource_id\`),
        FOREIGN KEY (\`resource_id\`) REFERENCES \`resources\` (\`resource_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `resource_meta`;');
  }
}

