import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from './entities/permission.entity';
import { PermissionDescriptionEntity } from './entities/permission_description.entity';
import { RolePermissionEntity } from '../roles/entities/role-permission.entity';

/**
 * PermissionsModule is responsible for managing permissions.
 * It includes the controller and service for handling operations
 * related to permissions and integrates with the message broker.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the PermissionEntity , PermissionDescriptionEntity for TypeORM.
    TypeOrmModule.forFeature([
      PermissionEntity,
      PermissionDescriptionEntity,
      RolePermissionEntity,
    ]),
  ],

  // Specifies the controllers that handle incoming requests.
  controllers: [PermissionsController],

  // Specifies the providers that contain the business logic.
  providers: [PermissionsService],
})
export class PermissionsModule {}
