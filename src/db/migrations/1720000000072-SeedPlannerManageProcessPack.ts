import { MigrationInterface, QueryRunner } from 'typeorm';
import { seedPlannerManageProcessPack } from '../../scheduler/seed/planner-manage-process-pack.seed';

/**
 * Week 7 — seed Object Designer objects + Dynamic Processes for Manage Planning
 * categories (platform template set `planner_manage`).
 */
export class SeedPlannerManageProcessPack1720000000072
  implements MigrationInterface
{
  name = 'SeedPlannerManageProcessPack1720000000072';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await seedPlannerManageProcessPack(queryRunner);
  }

  public async down(): Promise<void> {
    // Intentionally no-op: templates/objects may already be in use.
  }
}
