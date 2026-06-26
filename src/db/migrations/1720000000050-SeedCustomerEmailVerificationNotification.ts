import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  PLATFORM_NOTIFICATION_RULE_SEED,
  PLATFORM_NOTIFICATION_TEMPLATE_SEED,
} from '../../notifications/seed/platform-notification-templates.seed';

const TEMPLATE_KEYS = ['customer_email_verification'] as const;
const RULE_TEMPLATE_KEYS = ['customer_email_verification'] as const;

/**
 * Phase 5 — customer email verification notification template using urls.verification.
 */
export class SeedCustomerEmailVerificationNotification1720000000050
  implements MigrationInterface
{
  name = 'SeedCustomerEmailVerificationNotification1720000000050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const systemUserId = await this.resolveSystemUserId(queryRunner);
    const emailChannelId = await this.ensureEmailChannel(
      queryRunner,
      systemUserId,
    );

    const templates = PLATFORM_NOTIFICATION_TEMPLATE_SEED.filter((entry) =>
      (TEMPLATE_KEYS as readonly string[]).includes(entry.key),
    );
    const rules = PLATFORM_NOTIFICATION_RULE_SEED.filter((entry) =>
      (RULE_TEMPLATE_KEYS as readonly string[]).includes(entry.templateKey),
    );

    const templateIdByKey = new Map<string, number>();

    for (const template of templates) {
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

    for (const rule of rules) {
      const templateId = templateIdByKey.get(rule.templateKey);
      if (!templateId) {
        throw new Error(
          `SeedCustomerEmailVerificationNotification1720000000050: missing template ${rule.templateKey}`,
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
        SELECT 0, ?, CAST(? AS JSON), ?, ?, CAST(? AS JSON), ?, 1, ?, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM \`event_notification_rules\`
          WHERE \`tenant_id\` = 0
            AND \`event_name\` = ?
            AND \`template_id\` = ?
        )
        `,
        [
          rule.eventName,
          JSON.stringify(rule.filterJson ?? null),
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const templates = PLATFORM_NOTIFICATION_TEMPLATE_SEED.filter((entry) =>
      (TEMPLATE_KEYS as readonly string[]).includes(entry.key),
    );

    for (const template of templates) {
      await queryRunner.query(
        `
        DELETE r
        FROM \`event_notification_rules\` r
        INNER JOIN \`notification_templates\` t ON t.template_id = r.template_id
        WHERE t.name = ?
        `,
        [template.name],
      );
      await queryRunner.query(
        `DELETE FROM \`notification_templates\` WHERE \`name\` = ?`,
        [template.name],
      );
    }
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
        'SeedCustomerEmailVerificationNotification1720000000050: email channel missing',
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
        'SeedCustomerEmailVerificationNotification1720000000050: no users row available',
      );
    }

    return fallback[0].user_id;
  }
}
