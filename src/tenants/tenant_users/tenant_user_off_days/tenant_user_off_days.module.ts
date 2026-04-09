import { Module } from '@nestjs/common';
import { TenantUserOffDaysService } from './tenant_user_off_days.service';
import { TenantUserOffDaysController } from './tenant_user_off_days.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUserOffDaysEntity } from './entities/tenant_user_off_day.entity';

/**
 * TenantUserOffDaysModule is responsible for managing tenant user off days.
 * It includes the controller and service for handling operations related to tenant user off days
 * and integrates message broker configuration for microservices communication.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantUserOffDaysEntity]),
  ],
  controllers: [TenantUserOffDaysController],
  providers: [TenantUserOffDaysService],
})
export class TenantUserOffDaysModule {}
