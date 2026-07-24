import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Centralize Object Designer / Runner file-upload config in the storage settings group.
 * Seeds accept presets + defaults used by FE; Core MediaService reads max_upload_bytes.
 */
export class StorageUploadSettings1720000000061 implements MigrationInterface {
  name = 'StorageUploadSettings1720000000061';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const acceptPresetsJson = JSON.stringify([
      { value: 'image/*', label: 'Any image (image/*)' },
      { value: 'image/jpeg', label: 'JPEG image' },
      { value: 'image/png', label: 'PNG image' },
      { value: 'image/gif', label: 'GIF image' },
      { value: 'image/webp', label: 'WebP image' },
      { value: 'image/svg+xml', label: 'SVG image' },
      { value: 'video/*', label: 'Any video (video/*)' },
      { value: 'audio/*', label: 'Any audio (audio/*)' },
      { value: 'application/pdf', label: 'PDF' },
      { value: '.pdf', label: 'PDF extension (.pdf)' },
      { value: 'application/msword', label: 'Word (.doc)' },
      {
        value:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        label: 'Word (.docx)',
      },
      { value: 'application/vnd.ms-excel', label: 'Excel (.xls)' },
      {
        value:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        label: 'Excel (.xlsx)',
      },
      { value: 'text/csv', label: 'CSV' },
      { value: 'text/plain', label: 'Plain text' },
      { value: 'application/json', label: 'JSON' },
      { value: 'application/zip', label: 'ZIP archive' },
      { value: '.doc', label: 'DOC extension (.doc)' },
      { value: '.docx', label: 'DOCX extension (.docx)' },
      { value: '.xls', label: 'XLS extension (.xls)' },
      { value: '.xlsx', label: 'XLSX extension (.xlsx)' },
      { value: '.csv', label: 'CSV extension (.csv)' },
      { value: '.zip', label: 'ZIP extension (.zip)' },
    ]).replace(/'/g, "''");

    await queryRunner.query(`
      INSERT INTO \`system_setting_definitions\`
        (\`group_id\`, \`setting_key\`, \`label\`, \`description\`, \`value_type\`,
         \`constraints_json\`, \`default_value\`, \`is_tenant_overridable\`,
         \`is_sensitive\`, \`is_readonly\`, \`requires_restart\`, \`sort_order\`,
         \`is_active\`, \`created_by\`, \`updated_by\`)
      SELECT g.\`group_id\`, v.\`setting_key\`, v.\`label\`, v.\`description\`, v.\`value_type\`,
             v.\`constraints_json\`, v.\`default_value\`, v.\`is_tenant_overridable\`,
             v.\`is_sensitive\`, v.\`is_readonly\`, v.\`requires_restart\`, v.\`sort_order\`,
             1, 0, 0
      FROM (
        SELECT
          'storage.accept_presets' AS setting_key,
          'File accept presets' AS label,
          'Preset MIME types and extensions offered in Object Designer file/image fields' AS description,
          'json' AS value_type,
          NULL AS constraints_json,
          '${acceptPresetsJson}' AS default_value,
          0 AS is_tenant_overridable,
          0 AS is_sensitive,
          0 AS is_readonly,
          0 AS requires_restart,
          20 AS sort_order
        UNION ALL
        SELECT
          'storage.default_accept',
          'Default file accept',
          'Default HTML accept string for new file fields (empty = any type)',
          'string',
          NULL,
          '""',
          0, 0, 0, 0, 30
        UNION ALL
        SELECT
          'storage.image_default_accept',
          'Default image accept',
          'Default HTML accept string for new image fields',
          'string',
          NULL,
          '"image/*"',
          0, 0, 0, 0, 40
        UNION ALL
        SELECT
          'storage.max_files_per_field',
          'Default max files per field',
          'Default maxFiles when a field does not set validationJson.maxFiles',
          'number',
          '{"min":1,"max":100}',
          '1',
          1, 0, 0, 0, 50
        UNION ALL
        SELECT
          'storage.multi_file_default_max_files',
          'Default max files (multi)',
          'Default maxFiles when panel marks the field multiple and maxFiles is unset',
          'number',
          '{"min":1,"max":100}',
          '10',
          1, 0, 0, 0, 60
      ) AS v
      INNER JOIN \`system_setting_groups\` g ON g.\`group_key\` = 'storage'
      ON DUPLICATE KEY UPDATE
        \`label\` = VALUES(\`label\`),
        \`description\` = VALUES(\`description\`),
        \`default_value\` = VALUES(\`default_value\`),
        \`constraints_json\` = VALUES(\`constraints_json\`),
        \`sort_order\` = VALUES(\`sort_order\`)
    `);

    await queryRunner.query(`
      UPDATE \`system_setting_definitions\`
      SET \`default_value\` = '26214400',
          \`description\` = 'Platform ceiling for a single uploaded file (bytes). Field maxSizeBytes cannot exceed this.'
      WHERE \`setting_key\` = 'storage.max_upload_bytes'
        AND (\`default_value\` = '10485760' OR \`default_value\` = '\"10485760\"')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`system_setting_definitions\`
      WHERE \`setting_key\` IN (
        'storage.accept_presets',
        'storage.default_accept',
        'storage.image_default_accept',
        'storage.max_files_per_field',
        'storage.multi_file_default_max_files'
      )
    `);
  }
}
