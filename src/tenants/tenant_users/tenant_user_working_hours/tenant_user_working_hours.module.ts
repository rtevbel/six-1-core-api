import { Module } from '@nestjs/common';
import { TenantUserWorkingHoursService } from './tenant_user_working_hours.service';
import { TenantUserWorkingHoursController } from './tenant_user_working_hours.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUserWorkingHoursEntity } from './entities/tenant_user_working_hour.entity';
import { ConfigObjectsModule } from '../../../config_objects/config_objects.module';

/**
 * TenantUserWorkingHoursModule is responsible for managing tenant user working hours.
 * It includes the controller and service for handling operations related to tenant user working hours.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TenantUserWorkingHoursEntity for TypeORM.
    TypeOrmModule.forFeature([TenantUserWorkingHoursEntity]),
    ConfigObjectsModule,
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [TenantUserWorkingHoursController],

  // Specifies the providers that contain the business logic.
  providers: [TenantUserWorkingHoursService],
})
export class TenantUserWorkingHoursModule {}
