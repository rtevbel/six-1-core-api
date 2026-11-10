import { MigrationInterface, QueryRunner } from 'typeorm';
import { seedPlannerManageProcessPack } from '../../scheduler/seed/planner-manage-process-pack.seed';

/**
 * Re-run the Planner Manage Object Designer pack so new catalog fields and
 * default form views are applied on environments that already ran 0072.
 * `seedPlannerManageProcessPack` is idempotent (INSERT … WHERE NOT EXISTS /
 * UPDATE existing views).
 */
export class ReseedPlannerManageProcessPackFields1720000000073
  implements MigrationInterface
{
  name = 'ReseedPlannerManageProcessPackFields1720000000073';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await seedPlannerManageProcessPack(queryRunner);
  }

  public async down(): Promise<void> {
    // Intentionally no-op: added fields/views may already be in use.
  }
}
