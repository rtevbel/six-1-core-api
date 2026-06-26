import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  buildUserVerifyEmailRule,
  USER_SYSTEM_TABLE_VERIFICATION_FIELD_MAP,
} from '../../config_objects/verification/user-verification.constants';
import { CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL } from '../../config_objects/verification/config-verification.constants';

const USER_VERIFICATION_FIELD_MAP_JSON = JSON.stringify(
  USER_SYSTEM_TABLE_VERIFICATION_FIELD_MAP,
);
const USER_VERIFY_EMAIL_RULE = buildUserVerifyEmailRule(
  USER_SYSTEM_TABLE_VERIFICATION_FIELD_MAP,
);
const WHEN_JSON = JSON.stringify(USER_VERIFY_EMAIL_RULE.when);
const THEN_JSON = JSON.stringify(USER_VERIFY_EMAIL_RULE.then);

/**
 * Phase 6 — platform `user` system_table config object for generic email verification.
 */
export class UserEmailVerificationConfigObject1720000000051
  implements MigrationInterface
{
  name = 'UserEmailVerificationConfigObject1720000000051';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO \`config_objects\` (
        \`config_template_set_id\`,
        \`object_type\`,
        \`binding_mode\`,
        \`sor_table_name\`,
        \`display_name\`,
        \`description\`,
        \`status\`,
        \`verification_field_map\`
      )
      SELECT
        ts.\`config_template_set_id\`,
        'user',
        'system_table',
        'users',
        'User',
        'Platform user record for generic email verification',
        'PUBLISHED',
        CAST(? AS JSON)
      FROM \`config_template_sets\` ts
      WHERE ts.\`status\` = 'PUBLISHED'
        AND NOT EXISTS (
          SELECT 1
          FROM \`config_objects\` co
          WHERE co.\`config_template_set_id\` = ts.\`config_template_set_id\`
            AND co.\`object_type\` = 'user'
        )
      `,
      [USER_VERIFICATION_FIELD_MAP_JSON],
    );

    await queryRunner.query(
      `
      UPDATE \`config_objects\`
      SET
        \`binding_mode\` = 'system_table',
        \`sor_table_name\` = 'users',
        \`verification_field_map\` = CAST(? AS JSON)
      WHERE \`object_type\` = 'user'
        AND (\`verification_field_map\` IS NULL OR \`binding_mode\` <> 'system_table')
      `,
      [USER_VERIFICATION_FIELD_MAP_JSON],
    );

    await queryRunner.query(
      `
      INSERT INTO \`config_object_verification_rules\` (
        \`config_object_id\`,
        \`trigger_key\`,
        \`when_json\`,
        \`then_json\`,
        \`is_active\`
      )
      SELECT
        co.\`config_object_id\`,
        ?,
        CAST(? AS JSON),
        CAST(? AS JSON),
        1
      FROM \`config_objects\` co
      WHERE co.\`object_type\` = 'user'
        AND NOT EXISTS (
          SELECT 1
          FROM \`config_object_verification_rules\` r
          WHERE r.\`config_object_id\` = co.\`config_object_id\`
            AND r.\`trigger_key\` = ?
        )
      `,
      [
        CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL,
        WHEN_JSON,
        THEN_JSON,
        CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE r
      FROM \`config_object_verification_rules\` r
      INNER JOIN \`config_objects\` co ON co.\`config_object_id\` = r.\`config_object_id\`
      WHERE co.\`object_type\` = 'user'
      `,
    );

    await queryRunner.query(`
      DELETE FROM \`config_objects\`
      WHERE \`object_type\` = 'user'
        AND \`binding_mode\` = 'system_table'
        AND \`sor_table_name\` = 'users'
    `);
  }
}
