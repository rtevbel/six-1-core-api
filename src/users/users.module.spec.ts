import { MODULE_METADATA } from '@nestjs/common/constants';
import { UsersModule } from './users.module';
import { UserMetaModule } from './user-meta/user-meta.module';
import { ConfigObjectsModule } from '../config_objects/config_objects.module';
import { NotificationContextModule } from '../notifications/context/notification-context.module';
import { TenantsModule } from '../tenants/tenants.module';
import { TenantUserInvitationsModule } from '../tenants/tenant_users/tenant_user_invitations/tenant_user_invitations.module';

function assertNoUndefinedImports(
  moduleClass: new (...args: unknown[]) => unknown,
): void {
  const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, moduleClass) ?? [];
  const undefinedIndexes = (imports as unknown[])
    .map((entry, index) => (entry === undefined ? index : -1))
    .filter((index) => index >= 0);
  expect(undefinedIndexes).toEqual([]);
}

describe('UsersModule circular import wiring', () => {
  it('does not capture undefined modules while the config-objects cycle loads', () => {
    assertNoUndefinedImports(UsersModule);
    assertNoUndefinedImports(UserMetaModule);
    assertNoUndefinedImports(ConfigObjectsModule);
    assertNoUndefinedImports(NotificationContextModule);
    assertNoUndefinedImports(TenantsModule);
    assertNoUndefinedImports(TenantUserInvitationsModule);
  });
});
