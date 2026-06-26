import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  buildDefaultVerifyEmailRule,
  CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL,
} from '../../config_objects/verification/config-verification.constants';
import { DEFAULT_CONFIG_OBJECT_VERIFICATION_FIELD_MAP } from '../../config_objects/verification/config-object-verification.constants';

const DEFAULT_VERIFY_EMAIL_RULE = buildDefaultVerifyEmailRule(
  DEFAULT_CONFIG_OBJECT_VERIFICATION_FIELD_MAP,
);
const WHEN_JSON = JSON.stringify(DEFAULT_VERIFY_EMAIL_RULE.when);
const THEN_JSON = JSON.stringify(DEFAULT_VERIFY_EMAIL_RULE.then);

/**
 * Phase 3 — verification trigger rules (`verify_email`) for config objects.
 */
export class ConfigObjectVerificationRules1720000000049
  implements MigrationInterface
{
  name = 'ConfigObjectVerificationRules1720000000049';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`config_object_verification_rules\` (
        \`config_object_verification_rule_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`config_object_id\` BIGINT UNSIGNED NOT NULL,
        \`trigger_key\` VARCHAR(100) NOT NULL,
        \`when_json\` JSON NOT NULL,
        \`then_json\` JSON NOT NULL,
        \`is_active\` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (\`config_object_verification_rule_id\`),
        UNIQUE KEY \`uq_config_object_verification_trigger\` (\`config_object_id\`, \`trigger_key\`),
        KEY \`idx_config_object_verification_rules_object_id\` (\`config_object_id\`),
        CONSTRAINT \`fk_config_object_verification_rules_object\`
          FOREIGN KEY (\`config_object_id\`)
          REFERENCES \`config_objects\` (\`config_object_id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

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
      WHERE co.\`object_type\` = 'customer'
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
    await queryRunner.query(`
      DROP TABLE IF EXISTS \`config_object_verification_rules\`
    `);
  }
}
