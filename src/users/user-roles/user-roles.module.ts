import { Module } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { UserRolesController } from './user-roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRoleEntity } from './entities/user-role.entity';

/**
 * UserRolesModule is responsible for managing user roles.
 * It includes the controller and service for handling operations
 * related to user roles.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the UserRoleEntity for TypeORM.
    TypeOrmModule.forFeature([UserRoleEntity]),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [UserRolesController],
  // Specifies the providers that contain the business logic.
  providers: [UserRolesService],
  // Exports the service to make it available for other modules.
  exports: [UserRolesService],
})
export class UserRolesModule {}
