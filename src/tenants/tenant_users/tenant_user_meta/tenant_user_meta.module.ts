import { Module } from '@nestjs/common';
import { TenantUserMetaService } from './tenant_user_meta.service';
import { TenantUserMetaController } from './tenant_user_meta.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUserMetaEntity } from './entities/tenant_user_meta.entity';

/**
 * TenantUserMetaModule is responsible for managing tenant user metadata.
 * It includes the controller and service for handling operations related to tenant user metadata
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantUserMetaEntity]),
  ],
  controllers: [TenantUserMetaController],
  providers: [TenantUserMetaService],
})
export class TenantUserMetaModule {}
