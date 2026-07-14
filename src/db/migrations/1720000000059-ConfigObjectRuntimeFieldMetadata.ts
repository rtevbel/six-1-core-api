import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Runtime field metadata overlays for `system_table` config objects.
 * Stores lookup/derived authoring on existing entity column keys only.
 */
export class ConfigObjectRuntimeFieldMetadata1720000000059
  implements MigrationInterface
{
  name = 'ConfigObjectRuntimeFieldMetadata1720000000059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`config_object_runtime_field_metadata\` (
        \`config_object_runtime_field_metadata_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`config_object_id\` BIGINT UNSIGNED NOT NULL,
        \`field_key\` VARCHAR(100) NOT NULL,
        \`validation_json\` TEXT NULL COMMENT 'Lookup/derived authoring (_six1LookupSelectAuthoring, _six1DerivedRuntimeAuthoring)',
        \`rules_json\` TEXT NULL COMMENT 'Optional cross-field rules parity with config_object_field_rules',
        \`created_by\` BIGINT UNSIGNED NOT NULL,
        \`updated_by\` BIGINT UNSIGNED NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`config_object_runtime_field_metadata_id\`),
        UNIQUE KEY \`uq_runtime_field_metadata_object_field\` (\`config_object_id\`, \`field_key\`),
        KEY \`idx_runtime_field_metadata_object_id\` (\`config_object_id\`),
        CONSTRAINT \`fk_runtime_field_metadata_config_object\`
          FOREIGN KEY (\`config_object_id\`)
          REFERENCES \`config_objects\` (\`config_object_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`config_object_runtime_field_metadata\`
    `);
  }
}
