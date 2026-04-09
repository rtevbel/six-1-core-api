// Importing necessary modules and decorators from NestJS
import { Module } from '@nestjs/common';

// Importing the service and controller for tenant off days
import { TenantOffDaysService } from './tenant_off_days.service';
import { TenantOffDaysController } from './tenant_off_days.controller';

// Importing configuration service and utility functions

// Importing TypeORM module for database entity management
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantOffDaysEntity } from './entities/tenant_off_day.entity';


/**
 * TenantOffDaysModule is responsible for managing tenant off days.
 * It includes the controller and service for handling operations related to tenant off days
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantOffDaysEntity for TypeORM.
    TypeOrmModule.forFeature([TenantOffDaysEntity]),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [TenantOffDaysController],

  // Specifies the providers that contain the business logic.
  providers: [TenantOffDaysService],
})
export class TenantOffDaysModule {}
