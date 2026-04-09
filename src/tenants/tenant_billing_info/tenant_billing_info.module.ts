// Importing necessary modules and decorators from NestJS
import { Module } from '@nestjs/common';

// Importing the service and controller for tenant billing information
import { TenantBillingInfoService } from './tenant_billing_info.service';
import { TenantBillingInfoController } from './tenant_billing_info.controller';

// Importing configuration service and utility functions

// Importing TypeORM module for database entity management
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantBillingInfoEntity } from './entities/tenant_billing_info.entity';


/**
 * TenantBillingInfoModule is responsible for managing tenant billing information.
 * It includes the controller and service for handling operations related to tenant billing
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantBillingInfoEntity for TypeORM.
    TypeOrmModule.forFeature([TenantBillingInfoEntity]),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [TenantBillingInfoController],

  // Specifies the providers that contain the business logic.
  providers: [TenantBillingInfoService],
})
export class TenantBillingInfoModule {}
