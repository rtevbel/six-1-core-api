import { MigrationInterface, QueryRunner } from 'typeorm';
import { seedIndustryHvacInstallProcesses } from '../../process_templates/seed/industry-hvac-install-processes.seed';

/**
 * Seeds HVAC customer onboarding, install job, and tenant onboarding processes.
 */
export class SeedIndustryHvacInstallProcesses1720000000064
  implements MigrationInterface
{
  name = 'SeedIndustryHvacInstallProcesses1720000000064';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await seedIndustryHvacInstallProcesses(queryRunner);
  }

  public async down(): Promise<void> {
    // Intentionally no-op: templates may already be in use.
  }
}
