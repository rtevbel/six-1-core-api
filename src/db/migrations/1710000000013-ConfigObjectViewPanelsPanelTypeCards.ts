import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `cards` to `config_object_view_panels.panel_type` so authoring can use
 * panelType `cards` with layout_config displayMode `cards` without MySQL truncation.
 */
export class ConfigObjectViewPanelsPanelTypeCards1710000000013
  implements MigrationInterface
{
  name = 'ConfigObjectViewPanelsPanelTypeCards1710000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`config_object_view_panels\`
      MODIFY COLUMN \`panel_type\` ENUM(
        'summary','section','related','custom','cards'
      ) NOT NULL DEFAULT 'section'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`config_object_view_panels\`
      SET \`panel_type\` = 'section'
      WHERE \`panel_type\` = 'cards'
    `);
    await queryRunner.query(`
      ALTER TABLE \`config_object_view_panels\`
      MODIFY COLUMN \`panel_type\` ENUM(
        'summary','section','related','custom'
      ) NOT NULL DEFAULT 'section'
    `);
  }
}
