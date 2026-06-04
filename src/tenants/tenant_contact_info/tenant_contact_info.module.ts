import { Module } from '@nestjs/common';
import { TenantContactInfoService } from './tenant_contact_info.service';
import { TenantContactInfoController } from './tenant_contact_info.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantContactInfoEntity } from './entities/tenant_contact_info.entity';
import { ConfigObjectsModule } from '../../config_objects/config_objects.module';

/**
 * TenantContactInfoModule manages tenant contact information.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantContactInfoEntity]),
    ConfigObjectsModule,
  ],
  controllers: [TenantContactInfoController],
  providers: [TenantContactInfoService],
})
export class TenantContactInfoModule {}
