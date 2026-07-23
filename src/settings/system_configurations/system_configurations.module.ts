import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../../authorization/authorization.module';
import { SystemConfigurationsController } from './system_configurations.controller';
import { SystemConfigurationsService } from './system_configurations.service';
import { SecretEncryptionService } from './secret-encryption.service';
import { SystemSettingGroupEntity } from './entities/system-setting-group.entity';
import { SystemSettingDefinitionEntity } from './entities/system-setting-definition.entity';
import { SystemSettingValueEntity } from './entities/system-setting-value.entity';

/**
 * Dynamic typed system settings registry (groups, definitions, values).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemSettingGroupEntity,
      SystemSettingDefinitionEntity,
      SystemSettingValueEntity,
    ]),
    AuthorizationModule,
  ],
  controllers: [SystemConfigurationsController],
  providers: [SystemConfigurationsService, SecretEncryptionService],
  exports: [SystemConfigurationsService],
})
export class SystemConfigurationsModule {}
