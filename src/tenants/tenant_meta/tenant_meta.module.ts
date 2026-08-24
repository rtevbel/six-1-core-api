// Importing necessary modules and decorators from NestJS
import { Module, forwardRef } from '@nestjs/common';

// Importing the service and controller for tenant metadata
import { TenantMetaService } from './tenant_meta.service';
import { TenantMetaController } from './tenant_meta.controller';

// Importing configuration service and utility functions

// Importing TypeORM module and entity for tenant metadata
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantMetaEntity } from './entities/tenant_meta.entity';
import { ConfigObjectsModule } from '../../config_objects/config_objects.module';

/**
 * TenantMetaModule is responsible for managing tenant metadata.
 * It includes the controller and service for handling operations
 * related to tenant metadata and integrates message broker configuration.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantMetaEntity for TypeORM.
    TypeOrmModule.forFeature([TenantMetaEntity]),
    forwardRef(() => ConfigObjectsModule),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [TenantMetaController],

  // Specifies the providers that contain the business logic.
  providers: [TenantMetaService],
})
export class TenantMetaModule {}
