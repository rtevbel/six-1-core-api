import { MigrationInterface, QueryRunner } from 'typeorm';

type PlatformSystemTableSeed = {
  objectType: string;
  sorTableName: string;
  displayName: string;
  description: string;
};

const PLATFORM_SECURITY_SYSTEM_TABLE_OBJECTS: PlatformSystemTableSeed[] = [
  {
    objectType: 'role',
    sorTableName: 'roles',
    displayName: 'Role',
    description: 'Platform role definition for Object Designer and Runner',
  },
  {
    objectType: 'permission',
    sorTableName: 'permissions',
    displayName: 'Permission',
    description: 'Platform permission definition for Object Designer and Runner',
  },
  {
    objectType: 'role_descriptions',
    sorTableName: 'role_descriptions',
    displayName: 'Role Descriptions',
    description: 'Localized role descriptions for Object Designer and Runner',
  },
  {
    objectType: 'permission_descriptions',
    sorTableName: 'permission_descriptions',
    displayName: 'Permission Descriptions',
    description:
      'Localized permission descriptions for Object Designer and Runner',
  },
];

/**
 * Seeds platform security `system_table` config objects required for view authoring.
 */
export class SeedPlatformSecuritySystemTableConfigObjects1720000000058
  implements MigrationInterface
{
  name = 'SeedPlatformSecuritySystemTableConfigObjects1720000000058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const seed of PLATFORM_SECURITY_SYSTEM_TABLE_OBJECTS) {
      await queryRunner.query(
        `
        INSERT INTO \`config_objects\` (
          \`config_template_set_id\`,
          \`object_type\`,
          \`binding_mode\`,
          \`sor_table_name\`,
          \`display_name\`,
          \`description\`,
          \`status\`
        )
        SELECT
          ts.\`config_template_set_id\`,
          ?,
          'system_table',
          ?,
          ?,
          ?,
          'DRAFT'
        FROM \`config_template_sets\` ts
        WHERE ts.\`status\` = 'PUBLISHED'
          AND NOT EXISTS (
            SELECT 1
            FROM \`config_objects\` co
            WHERE co.\`config_template_set_id\` = ts.\`config_template_set_id\`
              AND co.\`object_type\` = ?
          )
        `,
        [
          seed.objectType,
          seed.sorTableName,
          seed.displayName,
          seed.description,
          seed.objectType,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const seed of PLATFORM_SECURITY_SYSTEM_TABLE_OBJECTS) {
      await queryRunner.query(
        `
        DELETE FROM \`config_objects\`
        WHERE \`object_type\` = ?
          AND \`binding_mode\` = 'system_table'
          AND \`sor_table_name\` = ?
        `,
        [seed.objectType, seed.sorTableName],
      );
    }
  }
}
