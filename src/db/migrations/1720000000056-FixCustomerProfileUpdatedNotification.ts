import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  CUSTOMER_PROFILE_UPDATED_RULE_FILTER,
  PLATFORM_NOTIFICATION_TEMPLATE_SEED,
} from '../../notifications/seed/platform-notification-templates.seed';

const TEMPLATE_KEY = 'customer_profile_updated';

/**
 * Stops tenant-admin "Customer profile updated" from firing on verification-token
 * patches and makes companyName optional when real profile edits do notify.
 */
export class FixCustomerProfileUpdatedNotification1720000000056
  implements MigrationInterface
{
  name = 'FixCustomerProfileUpdatedNotification1720000000056';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const template = PLATFORM_NOTIFICATION_TEMPLATE_SEED.find(
      (entry) => entry.key === TEMPLATE_KEY,
    );
    if (!template) {
      throw new Error(
        'FixCustomerProfileUpdatedNotification1720000000056: missing seed template',
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

    await queryRunner.query(
      `
      UPDATE \`event_notification_rules\` r
      INNER JOIN \`notification_templates\` t ON t.template_id = r.template_id
      SET r.filter_json = CAST(? AS JSON)
      WHERE t.name = ?
        AND r.event_name = 'six1-event.sor_bound_instance.updated'
      `,
      [JSON.stringify(CUSTOMER_PROFILE_UPDATED_RULE_FILTER), template.name],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
        'Customer profile updated — {{entity.fields.companyName}}',
        [
          'Hello {{recipient.name}},',
          '',
          'The customer profile for {{entity.fields.companyName}} was updated.',
          '{{#if payload.changedFields}}Changed fields: {{payload.changedFields}}{{/if}}',
        ].join('\n'),
        JSON.stringify([
          'recipient.name',
          'entity.fields.companyName',
          'payload.changedFields',
        ]),
        'Customer profile updated',
      ],
    );

    await queryRunner.query(
      `
      UPDATE \`event_notification_rules\` r
      INNER JOIN \`notification_templates\` t ON t.template_id = r.template_id
      SET r.filter_json = CAST(? AS JSON)
      WHERE t.name = ?
        AND r.event_name = 'six1-event.sor_bound_instance.updated'
      `,
      [
        JSON.stringify({ '==': [{ var: 'data.objectType' }, 'customer'] }),
        'Customer profile updated',
      ],
    );
  }
}
