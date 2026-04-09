// Importing necessary modules and decorators from NestJS
import { Module } from '@nestjs/common';

// Importing the service and controller for tenant working hours
import { TenantWorkingHoursService } from './tenant_working_hours.service';
import { TenantWorkingHoursController } from './tenant_working_hours.controller';

// Importing configuration service and utility functions

// Importing TypeORM module and entity for tenant working hours
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantWorkingHoursEntity } from './entities/tenant_working_hour.entity';

/**
 * TenantWorkingHoursModule is responsible for managing tenant working hours.
 * It includes the controller and service for handling operations related to tenant working hours
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantWorkingHoursEntity for TypeORM.
    TypeOrmModule.forFeature([TenantWorkingHoursEntity]),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [TenantWorkingHoursController],

  // Specifies the providers that contain the business logic.
  providers: [TenantWorkingHoursService],
})
export class TenantWorkingHoursModule {}
