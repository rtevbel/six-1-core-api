import { Module } from '@nestjs/common';
import { TenantSubscriptionService } from './tenant_subscriptions.service';
import { TenantSubscriptionController } from './tenant_subscriptions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantSubscriptionEntity } from './entities/tenant_subscription.entity';

/**
 * TenantSubscriptionsModule is responsible for managing tenant subscriptions.
 * It includes the controller and service for handling operations related to tenant subscriptions
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantSubscriptionEntity for TypeORM.
    TypeOrmModule.forFeature([TenantSubscriptionEntity]),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [TenantSubscriptionController],

  // Specifies the providers that contain the business logic.
  providers: [TenantSubscriptionService],
})
export class TenantSubscriptionsModule {}
