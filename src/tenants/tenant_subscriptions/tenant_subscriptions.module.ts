import { Module } from '@nestjs/common';
import { TenantSubscriptionService } from './tenant_subscriptions.service';
import { TenantSubscriptionController } from './tenant_subscriptions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import { ConfigObjectsModule } from '../../config_objects/config_objects.module';

/**
 * TenantSubscriptionsModule manages tenant subscriptions.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantSubscriptionEntity]),
    ConfigObjectsModule,
  ],
  controllers: [TenantSubscriptionController],
  providers: [TenantSubscriptionService],
})
export class TenantSubscriptionsModule {}
