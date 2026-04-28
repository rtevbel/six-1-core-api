import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds relationship provenance (`orm` vs `designer`) and optional
 * `relation_manifest_json` for `relationManifestsByKey` (dataRef/actionRef only).
 */
export class ConfigObjectRelationshipsSourceAndManifest1710000000012
  implements MigrationInterface
{
  name = 'ConfigObjectRelationshipsSourceAndManifest1710000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = 'config_object_relationships';

    await queryRunner.query(`
      ALTER TABLE \`${table}\`
      ADD COLUMN \`relationship_source\` ENUM('orm', 'designer') NOT NULL DEFAULT 'designer'
        AFTER \`relationship_key\`,
      ADD COLUMN \`relation_manifest_json\` JSON NULL
        COMMENT 'relationManifestsByKey: dataRef/actionRef only'
        AFTER \`query_config\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = 'config_object_relationships';

    await queryRunner.query(`
      ALTER TABLE \`${table}\`
      DROP COLUMN \`relation_manifest_json\`,
      DROP COLUMN \`relationship_source\`
    `);
  }
}
