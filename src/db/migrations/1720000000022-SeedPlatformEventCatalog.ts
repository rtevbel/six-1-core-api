import { MigrationInterface, QueryRunner } from 'typeorm';
import { PLATFORM_EVENT_CATALOG_SEED } from '../../events/seed/platform-event-catalog.seed';
import { DEFAULT_EVENT_SCHEMA_VERSION } from '../../events/constants/event-catalog.constants';

/**
 * Seeds platform event catalog entries (P0.2).
 * Idempotent upsert on unique `events.name`.
 */
export class SeedPlatformEventCatalog1720000000022
  implements MigrationInterface
{
  name = 'SeedPlatformEventCatalog1720000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const systemUserId = await this.resolveSystemUserId(queryRunner);

    for (const entry of PLATFORM_EVENT_CATALOG_SEED) {
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

  public async down(): Promise<void> {
    // Intentionally no-op: seeded rows may already have listeners and event logs.
  }

  private async resolveSystemUserId(queryRunner: QueryRunner): Promise<number> {
    const rows: Array<{ user_id: number }> = await queryRunner.query(`
      SELECT user_id
      FROM users
      WHERE username = 'system'
      LIMIT 1
    `);

    if (rows[0]?.user_id) {
      return rows[0].user_id;
    }

    const fallback: Array<{ user_id: number }> = await queryRunner.query(`
      SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1
    `);

    if (!fallback[0]?.user_id) {
      throw new Error(
        'SeedPlatformEventCatalog1720000000022: no users row available for created_by',
      );
    }

    return fallback[0].user_id;
  }
}
