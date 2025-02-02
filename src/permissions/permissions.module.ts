import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from './entities/permission.entity';
import { PermissionDescriptionEntity } from './entities/permission-description.entity';

/**
 * Permissions module for managing permissions and their descriptions.
 * 
 * @version 1.0.0
 * 
 * This module integrates with TypeORM to interact with `PermissionEntity` and 
 * `PermissionDescriptionEntity` for CRUD operations on permissions.
 * It provides a service (`PermissionsService`) to handle the business logic 
 * and a controller (`PermissionsController`) to expose the RESTful endpoints.
 * 
 */
@Module({
  imports: [TypeOrmModule.forFeature([PermissionEntity, PermissionDescriptionEntity])],
  controllers: [PermissionsController],
  providers: [PermissionsService],
})
export class PermissionsModule {}
