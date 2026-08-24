import { Module, forwardRef } from '@nestjs/common';
import { TenantBillingInfoService } from './tenant_billing_info.service';
import { TenantBillingInfoController } from './tenant_billing_info.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantBillingInfoEntity } from './entities/tenant_billing_info.entity';
import { ConfigObjectsModule } from '../../config_objects/config_objects.module';

/**
 * TenantBillingInfoModule manages tenant billing information.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantBillingInfoEntity]),
    forwardRef(() => ConfigObjectsModule),
  ],
  controllers: [TenantBillingInfoController],
  providers: [TenantBillingInfoService],
})
export class TenantBillingInfoModule {}
