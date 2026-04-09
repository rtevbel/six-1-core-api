// Importing necessary modules and decorators from NestJS
import { Module } from '@nestjs/common';

// Importing the service and controller for tenant contact information
import { TenantContactInfoService } from './tenant_contact_info.service';
import { TenantContactInfoController } from './tenant_contact_info.controller';

// Importing TypeORM module for database entity management
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantContactInfoEntity } from './entities/tenant_contact_info.entity';

// Importing configuration service and utility functions

/**
 * TenantContactInfoModule is responsible for managing tenant contact information.
 * It includes the controller and service for handling operations related to tenant contact information
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantContactInfoEntity for TypeORM.
    TypeOrmModule.forFeature([TenantContactInfoEntity]),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [TenantContactInfoController],

  // Specifies the providers that contain the business logic.
  providers: [TenantContactInfoService],
})
export class TenantContactInfoModule {}
