import { MigrationInterface, QueryRunner } from 'typeorm';
import { seedPlatformTenantUserInviteProcess } from '../../process_templates/seed/platform-tenant-user-invite-process.seed';

/**
 * Seeds the platform “Invite tenant user” journey bound to tenant_user_invitation.
 */
export class SeedPlatformTenantUserInviteProcess1720000000065
  implements MigrationInterface
{
  name = 'SeedPlatformTenantUserInviteProcess1720000000065';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await seedPlatformTenantUserInviteProcess(queryRunner);
  }

  public async down(): Promise<void> {
    // Intentionally no-op: templates may already be in use.
  }
}
