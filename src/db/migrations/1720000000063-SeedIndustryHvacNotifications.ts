import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  INDUSTRY_HVAC_NOTIFICATION_RULE_SEED,
  INDUSTRY_HVAC_NOTIFICATION_TEMPLATE_SEED,
} from '../../notifications/seed/industry-hvac-notification.seed';

/**
 * Seeds global HVAC install / tenant-onboarding notification templates and rules.
 */
export class SeedIndustryHvacNotifications1720000000063
  implements MigrationInterface
{
  name = 'SeedIndustryHvacNotifications1720000000063';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const systemUserId = await this.resolveSystemUserId(queryRunner);
    const emailChannelId = await this.ensureEmailChannel(
      queryRunner,
      systemUserId,
    );

    const templateIdByKey = new Map<string, number>();

    for (const template of INDUSTRY_HVAC_NOTIFICATION_TEMPLATE_SEED) {
      await queryRunner.query(
        `
        INSERT INTO \`notification_templates\` (
          \`name\`,
          \`subject\`,
          \`message\`,
          \`required_paths\`,
          \`channel_id\`,
          \`created_by\`
        )
        SELECT ?, ?, ?, CAST(? AS JSON), ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM \`notification_templates\` WHERE \`name\` = ?
        )
        `,
        [
          template.name,
          template.subject,
          template.message,
          JSON.stringify(template.requiredPaths),
          emailChannelId,
          systemUserId,
          template.name,
        ],
      );

      const rows: Array<{ template_id: number }> = await queryRunner.query(
        `SELECT template_id FROM notification_templates WHERE name = ? LIMIT 1`,
        [template.name],
      );
      if (rows[0]?.template_id) {
        templateIdByKey.set(template.key, rows[0].template_id);
      }
    }

    for (const rule of INDUSTRY_HVAC_NOTIFICATION_RULE_SEED) {
      const templateId = templateIdByKey.get(rule.templateKey);
      if (!templateId) {
        throw new Error(
          `SeedIndustryHvacNotifications1720000000063: missing template ${rule.templateKey}`,
        );
      }

      await queryRunner.query(
        `
        INSERT INTO \`event_notification_rules\` (
          \`tenant_id\`,
          \`event_name\`,
          \`filter_json\`,
          \`channel_id\`,
          \`template_id\`,
          \`recipient_spec\`,
          \`priority\`,
          \`is_active\`,
          \`created_by\`,
          \`updated_by\`
        )
        SELECT ?, ?, CAST(? AS JSON), ?, ?, CAST(? AS JSON), ?, 1, ?, NULL
        WHERE NOT EXISTS (
          SELECT 1
            FROM \`event_notification_rules\` r
           WHERE r.\`tenant_id\` = 0
             AND r.\`event_name\` = ?
             AND r.\`template_id\` = ?
        )
        `,
        [
          0,
          rule.eventName,
          rule.filterJson ? JSON.stringify(rule.filterJson) : null,
          emailChannelId,
          templateId,
          JSON.stringify(rule.recipientSpec),
          rule.priority ?? 100,
          systemUserId,
          rule.eventName,
          templateId,
        ],
      );
    }

    for (const entry of INDUSTRY_HVAC_NOTIFICATION_RULE_SEED) {
      await queryRunner.query(
        `
        INSERT INTO \`events\` (
          \`name\`,
          \`description\`,
          \`category\`,
          \`schema_version\`,
          \`is_system\`,
          \`created_by\`
        )
        SELECT ?, ?, 'domain', '1.0', 1, ?
        WHERE NOT EXISTS (SELECT 1 FROM \`events\` WHERE \`name\` = ?)
        `,
        [
          entry.eventName,
          `Platform event ${entry.eventName}`,
          systemUserId,
          entry.eventName,
        ],
      );
    }
  }

  public async down(): Promise<void> {
    // Intentionally no-op: seeded templates/rules may already be referenced.
  }

  private async ensureEmailChannel(
    queryRunner: QueryRunner,
    systemUserId: number,
  ): Promise<number> {
    await queryRunner.query(
      `
      INSERT INTO \`notification_channels\` (\`name\`, \`description\`, \`created_by\`)
      SELECT 'email', 'Email notifications', ?
      WHERE NOT EXISTS (
        SELECT 1 FROM \`notification_channels\` WHERE \`name\` = 'email'
      )
      `,
      [systemUserId],
    );

    const rows: Array<{ channel_id: number }> = await queryRunner.query(`
      SELECT channel_id FROM notification_channels WHERE name = 'email' LIMIT 1
    `);

    if (!rows[0]?.channel_id) {
      throw new Error(
        'SeedIndustryHvacNotifications1720000000063: email channel missing',
      );
    }

    return rows[0].channel_id;
  }

  private async resolveSystemUserId(queryRunner: QueryRunner): Promise<number> {
    const rows: Array<{ user_id: number }> = await queryRunner.query(`
      SELECT user_id FROM users WHERE username = 'system' LIMIT 1
    `);

    if (rows[0]?.user_id) {
      return rows[0].user_id;
    }

    const fallback: Array<{ user_id: number }> = await queryRunner.query(`
      SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1
    `);

    if (!fallback[0]?.user_id) {
      throw new Error(
        'SeedIndustryHvacNotifications1720000000063: no users row available',
      );
    }

    return fallback[0].user_id;
  }
}
