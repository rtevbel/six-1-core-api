import { Module } from '@nestjs/common';
import { TenantUserConfigurationsService } from './tenant_user_configurations.service';
import { TenantUserConfigurationsController } from './tenant_user_configurations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUserConfigurationsEntity } from './entities/tenant_user_configuration.entity';

/**
 * TenantUserConfigurationsModule is responsible for managing tenant user configurations.
 * It includes the controller and service for handling operations related to tenant user configurations
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantUserConfigurationsEntity]),
  ],
  controllers: [TenantUserConfigurationsController],
  providers: [TenantUserConfigurationsService],
})
export class TenantUserConfigurationsModule {}
