// Importing necessary modules and decorators from NestJS
import { Module, forwardRef } from '@nestjs/common';

// Importing the service and controller for tenant configurations
import { TenantConfigurationsService } from './tenant_configurations.service';
import { TenantConfigurationsController } from './tenant_configurations.controller';

// Importing configuration service and utility functions

// Importing TypeORM module for database entity management
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantConfigurationsEntity } from './entities/tenant_configuration.entity';
import { ConfigObjectsModule } from '../../config_objects/config_objects.module';


/**
 * TenantConfigurationsModule is responsible for managing tenant configurations.
 * It includes the controller and service for handling operations related to tenant configurations
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantConfigurationsEntity for TypeORM.
    TypeOrmModule.forFeature([TenantConfigurationsEntity]),
    forwardRef(() => ConfigObjectsModule),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [TenantConfigurationsController],

  // Specifies the providers that contain the business logic.
  providers: [TenantConfigurationsService],
})
export class TenantConfigurationsModule {}
