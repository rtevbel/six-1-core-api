import { Module } from '@nestjs/common';
import { SystemStatusesController } from './system_statuses.controller';
import { SystemStatusesService } from './system_statuses.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemStatusEntity } from './entities/system-status.entity';
import { ConfigObjectsModule } from '../../config_objects/config_objects.module';

/**
 * Module for managing system statuses.
 *
 * @version 0.0.1
 *
 * This module provides functionality for managing system statuses,
 * including creating, updating, retrieving, and deleting statuses.
 * It exports the SystemStatusesService for use in other modules.
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the SystemStatusEntity for TypeORM.
    TypeOrmModule.forFeature([SystemStatusEntity]),
    ConfigObjectsModule,
  ],
  controllers: [
    /**
     * Controller responsible for handling HTTP requests related to system statuses.
     */
    SystemStatusesController,
  ],
  providers: [
    /**
     * Service responsible for business logic related to system statuses.
     */
    SystemStatusesService,
  ],
  exports: [
    /**
     * Exports the SystemStatusesService to make it available in other modules.
     */
    SystemStatusesService,
  ],
})
export class SystemStatusesModule {}
