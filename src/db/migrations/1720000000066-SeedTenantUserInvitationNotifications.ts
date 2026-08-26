import { MigrationInterface, QueryRunner } from 'typeorm';
import { PLATFORM_EVENT_CATALOG_SEED } from '../../events/seed/platform-event-catalog.seed';
import { DEFAULT_EVENT_SCHEMA_VERSION } from '../../events/constants/event-catalog.constants';
import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import {
  PLATFORM_NOTIFICATION_RULE_SEED,
  PLATFORM_NOTIFICATION_TEMPLATE_SEED,
} from '../../notifications/seed/platform-notification-templates.seed';

const INVITATION_TEMPLATE_KEYS = [
  'tenant_user_invited',
  'tenant_user_invitation_accepted',
  'tenant_user_invitation_expired',
] as const;

const INVITATION_CATALOG_NAMES = new Set([
  PLATFORM_EVENT_NAMES.TENANT_USER_INVITED,
  PLATFORM_EVENT_NAMES.TENANT_USER_INVITATION_ACCEPTED,
  PLATFORM_EVENT_NAMES.TENANT_USER_INVITATION_EXPIRED,
  'tenant_user_invited',
  'tenant_user_invitation_accepted',
  'tenant_user_invitation_expired',
]);

/**
 * Canonical tenant-user invitation events, email templates, and rules.
 * Invitee mail uses the invitation email on the event payload (no user yet).
 */
export class SeedTenantUserInvitationNotifications1720000000066
  implements MigrationInterface
{
  name = 'SeedTenantUserInvitationNotifications1720000000066';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const systemUserId = await this.resolveSystemUserId(queryRunner);
    const emailChannelId = await this.ensureEmailChannel(
      queryRunner,
      systemUserId,
    );

    await this.upsertCatalogEvents(queryRunner, systemUserId);

    const templateIdByKey = new Map<string, number>();
    for (const key of INVITATION_TEMPLATE_KEYS) {
      const template = PLATFORM_NOTIFICATION_TEMPLATE_SEED.find(
        (entry) => entry.key === key,
      );
      if (!template) {
        throw new Error(
          `SeedTenantUserInvitationNotifications1720000000066: missing template ${key}`,
        );
      }

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

      await queryRunner.query(
        `
        UPDATE \`notification_templates\`
        SET
          \`subject\` = ?,
          \`message\` = ?,
          \`required_paths\` = CAST(? AS JSON)
        WHERE \`name\` = ?
        `,
        [
          template.subject,
          template.message,
          JSON.stringify(template.requiredPaths),
          template.name,
        ],
      );

      const rows: Array<{ template_id: number }> = await queryRunner.query(
        `SELECT template_id FROM notification_templates WHERE name = ? LIMIT 1`,
        [template.name],
      );
      if (!rows[0]?.template_id) {
        throw new Error(
          `SeedTenantUserInvitationNotifications1720000000066: template ${template.name} missing after upsert`,
        );
      }
      templateIdByKey.set(key, rows[0].template_id);
    }

    const invitationRules = PLATFORM_NOTIFICATION_RULE_SEED.filter((rule) =>
      INVITATION_TEMPLATE_KEYS.includes(
        rule.templateKey as (typeof INVITATION_TEMPLATE_KEYS)[number],
      ),
    );

    for (const rule of invitationRules) {
      const templateId = templateIdByKey.get(rule.templateKey);
      if (!templateId) {
        throw new Error(
          `SeedTenantUserInvitationNotifications1720000000066: missing template ${rule.templateKey}`,
        );
      }

      await queryRunner.query(
        `
        UPDATE \`event_notification_rules\`
        SET
          \`event_name\` = ?,
          \`recipient_spec\` = CAST(? AS JSON),
          \`filter_json\` = CAST(? AS JSON),
          \`is_active\` = 1
        WHERE \`template_id\` = ?
          AND \`tenant_id\` = 0
        `,
        [
          rule.eventName,
          JSON.stringify(rule.recipientSpec),
          rule.filterJson ? JSON.stringify(rule.filterJson) : null,
          templateId,
        ],
      );

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

    await queryRunner.query(
      `
      UPDATE \`event_notification_rules\` r
      INNER JOIN \`notification_channels\` c ON c.channel_id = r.channel_id
      SET
        r.event_name = ?,
        r.is_active = 0
      WHERE r.event_name IN (?, ?)
        AND c.name IN ('sms', 'push')
      `,
      [
        PLATFORM_EVENT_NAMES.TENANT_USER_INVITED,
        'tenant_user_invited',
        PLATFORM_EVENT_NAMES.TENANT_USER_INVITED,
      ],
    );

    await queryRunner.query(
      `
      UPDATE \`event_notification_rules\`
      SET event_name = ?
      WHERE event_name = ?
      `,
      [
        PLATFORM_EVENT_NAMES.TENANT_USER_INVITATION_ACCEPTED,
        'tenant_user_invitation_accepted',
      ],
    );

    await queryRunner.query(
      `
      UPDATE \`event_notification_rules\`
      SET event_name = ?
      WHERE event_name = ?
      `,
      [
        PLATFORM_EVENT_NAMES.TENANT_USER_INVITATION_EXPIRED,
        'tenant_user_invitation_expired',
      ],
    );
  }

  public async down(): Promise<void> {
    // Intentionally no-op: seeded catalog/templates/rules may already be referenced.
  }

  private async upsertCatalogEvents(
    queryRunner: QueryRunner,
    systemUserId: number,
  ): Promise<void> {
    for (const entry of PLATFORM_EVENT_CATALOG_SEED) {
      if (!INVITATION_CATALOG_NAMES.has(entry.name)) {
        continue;
      }

      await queryRunner.query(
        `
        INSERT INTO \`events\` (
          \`name\`,
          \`description\`,
          \`category\`,
          \`schema_version\`,
          \`payload_schema\`,
          \`is_system\`,
          \`created_by\`
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`description\` = VALUES(\`description\`),
          \`category\` = VALUES(\`category\`),
          \`schema_version\` = VALUES(\`schema_version\`),
          \`payload_schema\` = VALUES(\`payload_schema\`),
          \`is_system\` = VALUES(\`is_system\`)
        `,
        [
          entry.name,
          entry.description,
          entry.category,
          entry.schemaVersion ?? DEFAULT_EVENT_SCHEMA_VERSION,
          entry.payloadSchema ? JSON.stringify(entry.payloadSchema) : null,
          entry.isSystem ? 1 : 0,
          systemUserId,
        ],
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
        'SeedTenantUserInvitationNotifications1720000000066: email channel missing',
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
        'SeedTenantUserInvitationNotifications1720000000066: no users row available',
      );
    }

    return fallback[0].user_id;
  }
}
