import { Module } from '@nestjs/common';
import { SystemLanguagesModule } from './system_languages/system_languages.module';
import { SystemStatusesModule } from './system_statuses/system_statuses.module';
import { SystemConfigurationsModule } from './system_configurations/system_configurations.module';

/**
 * The SettingsModule is responsible for managing application settings.
 *
 * This module imports the SystemLanguagesModule, SystemStatusesModule, and
 * SystemConfigurationsModule (typed settings registry). It acts as a central
 * module for handling settings-related operations within the application.
 */
@Module({
  imports: [
    /**
     * Module for managing system languages.
     */
    SystemLanguagesModule,

    /**
     * Module for managing system statuses.
     */
    SystemStatusesModule,

    /**
     * Dynamic typed system settings / configurations registry.
     */
    SystemConfigurationsModule,
  ],
})
export class SettingsModule {}