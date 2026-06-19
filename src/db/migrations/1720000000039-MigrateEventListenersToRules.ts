import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Copies any legacy `event_listeners` rows not yet present in
 * `event_notification_rules` (idempotent re-run of 1720000000024 insert).
 */
export class MigrateEventListenersToRules1720000000039
  implements MigrationInterface
{
  name = 'MigrateEventListenersToRules1720000000039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
      SELECT
        0,
        e.\`name\`,
        NULL,
        el.\`channel_id\`,
        el.\`template_id\`,
        JSON_OBJECT('type', 'event_actor'),
        100,
        el.\`is_active\`,
        el.\`created_by\`,
        CASE WHEN el.\`updated_by\` = 0 THEN NULL ELSE el.\`updated_by\` END
      FROM \`event_listeners\` el
      INNER JOIN \`events\` e ON e.\`event_id\` = el.\`event_id\`
      WHERE NOT EXISTS (
        SELECT 1
          FROM \`event_notification_rules\` r
         WHERE r.\`tenant_id\` = 0
           AND r.\`event_name\` = e.\`name\`
           AND r.\`channel_id\` = el.\`channel_id\`
           AND r.\`template_id\` = el.\`template_id\`
      )
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: do not delete migrated rules on rollback.
  }
}
