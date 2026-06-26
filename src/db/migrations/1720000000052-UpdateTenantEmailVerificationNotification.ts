import { MigrationInterface, QueryRunner } from 'typeorm';
import { PLATFORM_NOTIFICATION_TEMPLATE_SEED } from '../../notifications/seed/platform-notification-templates.seed';

const TEMPLATE_KEY = 'tenant_email_verification_requested';

/**
 * Phase 6 — tenant email verification template uses urls.verification.
 */
export class UpdateTenantEmailVerificationNotification1720000000052
  implements MigrationInterface
{
  name = 'UpdateTenantEmailVerificationNotification1720000000052';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const template = PLATFORM_NOTIFICATION_TEMPLATE_SEED.find(
      (entry) => entry.key === TEMPLATE_KEY,
    );
    if (!template) {
      throw new Error(
        `UpdateTenantEmailVerificationNotification1720000000052: missing seed template ${TEMPLATE_KEY}`,
      );
    }

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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE \`notification_templates\`
      SET
        \`message\` = ?,
        \`required_paths\` = CAST(? AS JSON)
      WHERE \`name\` = ?
      `,
      [
        [
          'Hello {{recipient.name}},',
          '',
          'Please verify your email{{#if tenant.name}} for {{tenant.name}}{{/if}}.',
          '',
          'Verify here: {{payload.verificationUrl}}',
          '',
          'This link expires in {{payload.expiryHours}} hours.',
          '{{#if payload.loginUrl}}',
          'After verification, sign in at: {{payload.loginUrl}}',
          '{{/if}}',
        ].join('\n'),
        JSON.stringify([
          'recipient.name',
          'tenant.name',
          'payload.verificationUrl',
          'payload.expiryHours',
          'payload.loginUrl',
        ]),
        'Tenant email verification — requested',
      ],
    );
  }
}
