import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { RoleDescriptionEntity } from './entities/role-description.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { ConfigObjectsModule } from '../config_objects/config_objects.module';
import { UserRoleEntity } from '../users/user-roles/entities/user-role.entity';
import { TenantUsersEntity } from '../tenants/tenant_users/entities/tenant_user.entity';

/**
 * RolesModule is responsible for managing roles.
 * It includes the controller and service for handling operations
 * related to roles and integrates with the message broker.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the RoleEntity for TypeORM.
    TypeOrmModule.forFeature([
      RoleEntity,
      RoleDescriptionEntity,
      RolePermissionEntity,
      UserRoleEntity,
      TenantUsersEntity,
    ]),
    ConfigObjectsModule,
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [RolesController],

  // Specifies the providers that contain the business logic.
  providers: [RolesService],
})
export class RolesModule {}
