import { Module } from '@nestjs/common';
import { TenantUserRoleService } from './tenant_user_roles.service';
import { TenantUserRoleController } from './tenant_user_roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUserRoleEntity } from './entities/tenant_user_role.entity';

/**
 * TenantUserRolesModule is responsible for managing tenant user roles.
 * It includes the controller and service for handling operations related to tenant user roles
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantUserRoleEntity]),
  ],
  controllers: [TenantUserRoleController],
  providers: [TenantUserRoleService],
})
export class TenantUserRolesModule {}
