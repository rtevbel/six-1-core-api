import { Module } from '@nestjs/common';
import { TenantOffDaysService } from './tenant_off_days.service';
import { TenantOffDaysController } from './tenant_off_days.controller';

@Module({
  controllers: [TenantOffDaysController],
  providers: [TenantOffDaysService],
})
export class TenantOffDaysModule {}
