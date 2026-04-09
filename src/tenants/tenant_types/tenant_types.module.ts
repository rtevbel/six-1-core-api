// Importing necessary modules and decorators from NestJS
import { Module } from '@nestjs/common';

// Importing the service and controller for tenant types
import { TenantTypesService } from './tenant_types.service';
import { TenantTypesController } from './tenant_types.controller';

// Importing configuration service and utility functions

// Importing TypeORM module and entity for tenant types
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantTypeEntity } from './entities/tenant_type.entity';

/**
 * TenantTypesModule is responsible for managing tenant types.
 * It includes the controller and service for handling operations
 * related to tenant types and integrates RabbitMQ for message brokering.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantTypeEntity for TypeORM.
    TypeOrmModule.forFeature([TenantTypeEntity]),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [TenantTypesController],

  // Specifies the providers that contain the business logic.
  providers: [TenantTypesService],
})
export class TenantTypesModule {}
