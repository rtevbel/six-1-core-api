import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Customer email verification fires on process_step_ready when the workflow has a customer ref.
 */
export class FixCustomerEmailVerificationRule1720000000055
  implements MigrationInterface
{
  name = 'FixCustomerEmailVerificationRule1720000000055';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE \`event_notification_rules\` r
      INNER JOIN \`notification_templates\` t ON t.template_id = r.template_id
      SET
        r.filter_json = CAST(? AS JSON),
        r.recipient_spec = CAST(? AS JSON)
      WHERE t.name = 'Customer email verification'
        AND r.event_name = 'six1-event.process_step_ready'
      `,
      [
        JSON.stringify({ '!!': [{ var: 'refs.customerCoreId' }] }),
        JSON.stringify({ type: 'workflow_customer_email' }),
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE \`event_notification_rules\` r
      INNER JOIN \`notification_templates\` t ON t.template_id = r.template_id
      SET
        r.filter_json = CAST(? AS JSON),
        r.recipient_spec = CAST(? AS JSON)
      WHERE t.name = 'Customer email verification'
        AND r.event_name = 'six1-event.process_step_ready'
      `,
      [
        JSON.stringify({
          and: [
            { '==': [{ var: 'data.subjectType' }, 'customer'] },
            { '!!': [{ var: 'data.assigneeId' }] },
          ],
        }),
        JSON.stringify({ type: 'assignee' }),
      ],
    );
  }
}
