import { Module } from '@nestjs/common';
import { SystemLanguagesModule } from './system_languages/system_languages.module';
import { SystemStatusesModule } from './system_statuses/system_statuses.module';

/**
 * The SettingsModule is responsible for managing application settings.
 *
 * This module imports the SystemLanguagesModule and SystemStatusesModule to provide
 * functionality related to system languages and statuses. It acts as a central module
 * for handling settings-related operations within the application.
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
  ],
})
export class SettingsModule {}
