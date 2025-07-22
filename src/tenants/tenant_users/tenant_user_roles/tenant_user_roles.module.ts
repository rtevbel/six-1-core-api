import { Module } from '@nestjs/common';
import { TenantUserRolesService } from './tenant_user_roles.service';
import { TenantUserRolesController } from './tenant_user_roles.controller';

@Module({
  controllers: [TenantUserRolesController],
  providers: [TenantUserRolesService],
})
export class TenantUserRolesModule {}
