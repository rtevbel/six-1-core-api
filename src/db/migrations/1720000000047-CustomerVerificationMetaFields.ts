import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  CONFIG_OBJECT_VERIFICATION_SECTION_KEY,
  DEFAULT_CONFIG_OBJECT_VERIFICATION_FIELD_MAP,
  DEFAULT_VERIFICATION_EXPIRES_AT_FIELD,
  DEFAULT_VERIFICATION_TOKEN_FIELD,
  DEFAULT_VERIFICATION_VERIFIED_FIELD,
} from '../../config_objects/verification/config-object-verification.constants';

const HIDDEN_UI_VALIDATION_JSON = JSON.stringify({ ui: { hidden: true } });
const VERIFICATION_FIELD_MAP_JSON = JSON.stringify(
  DEFAULT_CONFIG_OBJECT_VERIFICATION_FIELD_MAP,
);

const VERIFICATION_FIELDS = [
  {
    fieldKey: DEFAULT_VERIFICATION_TOKEN_FIELD,
    label: 'Verification Token',
    description: 'System-managed email verification token',
    fieldType: 'text',
    orderIndex: 1,
    defaultValue: null,
  },
  {
    fieldKey: DEFAULT_VERIFICATION_EXPIRES_AT_FIELD,
    label: 'Token Expires At',
    description: 'System-managed verification token expiry (ISO datetime)',
    fieldType: 'datetime',
    orderIndex: 2,
    defaultValue: null,
  },
  {
    fieldKey: DEFAULT_VERIFICATION_VERIFIED_FIELD,
    label: 'Email Verified',
    description: 'Whether the primary email has been verified',
    fieldType: 'boolean',
    orderIndex: 3,
    defaultValue: JSON.stringify(false),
  },
] as const;

/**
 * Phase 1 — generic email verification field contract for customer config objects.
 *
 * @see docs/generic-email-verification-platform.md
 */
export class CustomerVerificationMetaFields1720000000047
  implements MigrationInterface
{
  name = 'CustomerVerificationMetaFields1720000000047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`config_objects\`
      ADD COLUMN \`verification_field_map\` JSON NULL
      COMMENT 'Optional token/expiry/verified field keys and TTL for generic email verification'
      AFTER \`status\`
    `);

    const systemUserId = await this.resolveSystemUserId(queryRunner);

    for (const field of VERIFICATION_FIELDS) {
      await queryRunner.query(
        `
        INSERT INTO \`config_object_fields\` (
          \`config_object_id\`,
          \`field_key\`,
          \`label\`,
          \`description\`,
          \`field_type\`,
          \`validation_json\`,
          \`default_value\`,
          \`is_required\`,
          \`is_system\`,
          \`order_index\`,
          \`section_key\`,
          \`created_by\`,
          \`updated_by\`
        )
        SELECT
          co.\`config_object_id\`,
          ?,
          ?,
          ?,
          ?,
          CAST(? AS JSON),
          ${field.defaultValue == null ? 'NULL' : 'CAST(? AS JSON)'},
          0,
          1,
          ?,
          ?,
          ?,
          ?
        FROM \`config_objects\` co
        WHERE co.\`object_type\` = 'customer'
          AND NOT EXISTS (
            SELECT 1
            FROM \`config_object_fields\` f
            WHERE f.\`config_object_id\` = co.\`config_object_id\`
              AND f.\`field_key\` = ?
          )
        `,
        field.defaultValue == null
          ? [
              field.fieldKey,
              field.label,
              field.description,
              field.fieldType,
              HIDDEN_UI_VALIDATION_JSON,
              field.orderIndex,
              CONFIG_OBJECT_VERIFICATION_SECTION_KEY,
              systemUserId,
              systemUserId,
              field.fieldKey,
            ]
          : [
              field.fieldKey,
              field.label,
              field.description,
              field.fieldType,
              HIDDEN_UI_VALIDATION_JSON,
              field.defaultValue,
              field.orderIndex,
              CONFIG_OBJECT_VERIFICATION_SECTION_KEY,
              systemUserId,
              systemUserId,
              field.fieldKey,
            ],
      );

      await queryRunner.query(
        `
        INSERT INTO \`config_object_field_rules\` (
          \`config_object_field_id\`,
          \`lifecycle_state_key\`,
          \`role_key\`,
          \`is_visible\`,
          \`is_readonly\`,
          \`is_required\`
        )
        SELECT
          f.\`config_object_field_id\`,
          NULL,
          NULL,
          0,
          1,
          0
        FROM \`config_object_fields\` f
        INNER JOIN \`config_objects\` co
          ON co.\`config_object_id\` = f.\`config_object_id\`
        WHERE co.\`object_type\` = 'customer'
          AND f.\`field_key\` = ?
          AND NOT EXISTS (
            SELECT 1
            FROM \`config_object_field_rules\` r
            WHERE r.\`config_object_field_id\` = f.\`config_object_field_id\`
              AND r.\`lifecycle_state_key\` IS NULL
              AND r.\`role_key\` IS NULL
          )
        `,
        [field.fieldKey],
      );
    }

    await queryRunner.query(
      `
      UPDATE \`config_objects\`
      SET \`verification_field_map\` = CAST(? AS JSON)
      WHERE \`object_type\` = 'customer'
        AND \`verification_field_map\` IS NULL
      `,
      [VERIFICATION_FIELD_MAP_JSON],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE r
      FROM \`config_object_field_rules\` r
      INNER JOIN \`config_object_fields\` f
        ON f.\`config_object_field_id\` = r.\`config_object_field_id\`
      INNER JOIN \`config_objects\` co
        ON co.\`config_object_id\` = f.\`config_object_id\`
      WHERE co.\`object_type\` = 'customer'
        AND f.\`field_key\` IN (?, ?, ?)
      `,
      [
        DEFAULT_VERIFICATION_TOKEN_FIELD,
        DEFAULT_VERIFICATION_EXPIRES_AT_FIELD,
        DEFAULT_VERIFICATION_VERIFIED_FIELD,
      ],
    );

    await queryRunner.query(
      `
      DELETE f
      FROM \`config_object_fields\` f
      INNER JOIN \`config_objects\` co
        ON co.\`config_object_id\` = f.\`config_object_id\`
      WHERE co.\`object_type\` = 'customer'
        AND f.\`field_key\` IN (?, ?, ?)
      `,
      [
        DEFAULT_VERIFICATION_TOKEN_FIELD,
        DEFAULT_VERIFICATION_EXPIRES_AT_FIELD,
        DEFAULT_VERIFICATION_VERIFIED_FIELD,
      ],
    );

    await queryRunner.query(`
      UPDATE \`config_objects\`
      SET \`verification_field_map\` = NULL
      WHERE \`object_type\` = 'customer'
    `);

    await queryRunner.query(`
      ALTER TABLE \`config_objects\`
      DROP COLUMN \`verification_field_map\`
    `);
  }

  private async resolveSystemUserId(queryRunner: QueryRunner): Promise<number> {
    const rows = (await queryRunner.query(
      `
      SELECT \`tenant_user_id\` AS id
      FROM \`tenant_users\`
      ORDER BY \`tenant_user_id\` ASC
      LIMIT 1
      `,
    )) as Array<{ id: number }>;

    if (!rows.length || rows[0].id == null) {
      throw new Error(
        'CustomerVerificationMetaFields1720000000047: no tenant_users row for created_by',
      );
    }

    return Number(rows[0].id);
  }
}
