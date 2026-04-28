import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Merges legacy `view_type = board` rows into sibling `list` views (same object,
 * tenant, role), then converts remaining board-only rows to `list` with
 * `config_json` shaped for {@link validateAndNormalizeListViewConfigJson}.
 *
 * Finally replaces ENUM `('list','board','detail')` with `('list','detail','form')`.
 */
export class ConfigObjectViewsReplaceBoardWithForm1710000000011
  implements MigrationInterface
{
  name = 'ConfigObjectViewsReplaceBoardWithForm1710000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = 'config_object_views';

    // 1) Merge each board row into the matching list row (same scope triple).
    await queryRunner.query(`
      UPDATE \`${table}\` AS l
      INNER JOIN (
        SELECT
          b2.config_object_id,
          b2.tenant_id,
          b2.role_key,
          MAX(b2.config_object_view_id) AS max_board_view_id
        FROM \`${table}\` AS b2
        WHERE b2.view_type = 'board'
        GROUP BY b2.config_object_id, b2.tenant_id, b2.role_key
      ) AS latest_board
        ON l.view_type = 'list'
       AND l.config_object_id = latest_board.config_object_id
       AND l.tenant_id <=> latest_board.tenant_id
       AND l.role_key <=> latest_board.role_key
      INNER JOIN \`${table}\` AS b
        ON b.config_object_view_id = latest_board.max_board_view_id
      SET l.config_json = JSON_MERGE_PATCH(
        COALESCE(CAST(l.config_json AS JSON), JSON_OBJECT('schemaVersion', 1)),
        JSON_OBJECT(
          'schemaVersion', 1,
          'defaultPresentation', 'board',
          'board', COALESCE(CAST(b.config_json AS JSON), JSON_OBJECT())
        )
      )
    `);

    // 2) Remove board rows that had a list sibling (merged above).
    await queryRunner.query(`
      DELETE b FROM \`${table}\` AS b
      INNER JOIN \`${table}\` AS l
        ON l.view_type = 'list'
       AND b.view_type = 'board'
       AND l.config_object_id = b.config_object_id
       AND l.tenant_id <=> b.tenant_id
       AND l.role_key <=> b.role_key
    `);

    // 3) Remaining board-only rows become list rows with board subsection.
    await queryRunner.query(`
      UPDATE \`${table}\`
      SET view_type = 'list',
          config_json = JSON_MERGE_PATCH(
            JSON_OBJECT('schemaVersion', 1, 'defaultPresentation', 'board'),
            JSON_OBJECT(
              'board',
              COALESCE(CAST(config_json AS JSON), JSON_OBJECT())
            )
          )
      WHERE view_type = 'board'
    `);

    // 4) Replace ENUM: drop board, add form.
    await queryRunner.query(`
      ALTER TABLE \`${table}\`
      MODIFY COLUMN view_type ENUM('list', 'detail', 'form') NOT NULL DEFAULT 'list'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = 'config_object_views';

    await queryRunner.query(`
      ALTER TABLE \`${table}\`
      MODIFY COLUMN view_type ENUM('list', 'board', 'detail') NOT NULL DEFAULT 'list'
    `);

    // Cannot restore deleted board rows or split merged JSON; down only restores ENUM shape.
  }
}
