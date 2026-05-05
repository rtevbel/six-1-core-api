import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aligns `panel_type` with layout `displayMode` values (table, cards, summary,
 * form-section, timeline, custom-slot). Legacy `section` → `form-section`,
 * `related` → `table` + `layout_config.dataBinding = "relation"`, `custom` → `custom-slot`.
 */
export class ConfigObjectViewPanelsPanelTypeDisplayModes1710000000014
  implements MigrationInterface
{
  name = 'ConfigObjectViewPanelsPanelTypeDisplayModes1710000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`config_object_view_panels\`
      MODIFY COLUMN \`panel_type\` ENUM(
        'summary','section','related','custom','cards',
        'table','form-section','timeline','custom-slot'
      ) NOT NULL DEFAULT 'section'
    `);

    await queryRunner.query(`
      UPDATE \`config_object_view_panels\`
      SET
        \`panel_type\` = 'table',
        \`layout_config\` = JSON_SET(
          COALESCE(\`layout_config\`, JSON_OBJECT()),
          '$.dataBinding', 'relation'
        )
      WHERE \`panel_type\` = 'related'
    `);

    await queryRunner.query(`
      UPDATE \`config_object_view_panels\`
      SET \`panel_type\` = 'form-section'
      WHERE \`panel_type\` = 'section'
    `);

    await queryRunner.query(`
      UPDATE \`config_object_view_panels\`
      SET \`panel_type\` = 'custom-slot'
      WHERE \`panel_type\` = 'custom'
    `);

    await queryRunner.query(`
      ALTER TABLE \`config_object_view_panels\`
      MODIFY COLUMN \`panel_type\` ENUM(
        'table','cards','summary','form-section','timeline','custom-slot'
      ) NOT NULL DEFAULT 'form-section'
    `);
  }

  public async down(): Promise<void> {
    // Not safely reversible: row semantics (table + dataBinding relation vs legacy
    // `related`) cannot be recovered without ad-hoc SQL. Restore from backup if needed.
  }
}
