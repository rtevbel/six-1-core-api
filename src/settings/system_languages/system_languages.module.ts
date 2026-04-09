import { Module } from '@nestjs/common';
import { SystemLanguagesController } from './system_languages.controller';
import { SystemLanguagesService } from './system_languages.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemLanguageEntity } from './entities/system-language.entity';
import { RoleDescriptionEntity } from '../../roles/entities/role-description.entity';

/**
 * Module for managing system languages.
 *
 * @version 0.0.1
 *
 * This module provides functionality for managing system languages,
 * including creating, updating, retrieving, and deleting languages.
 * It exports the SystemLanguagesService for use in other modules.
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the SystemLanguageEntity , RoleDescriptionEntity for TypeORM.
    TypeOrmModule.forFeature([SystemLanguageEntity, RoleDescriptionEntity]),
  ],
  controllers: [
    /**
     * Controller responsible for handling HTTP requests related to system languages.
     */
    SystemLanguagesController,
  ],
  providers: [
    /**
     * Service responsible for business logic related to system languages.
     */
    SystemLanguagesService,
  ],
  exports: [
    /**
     * Exports the SystemLanguagesService to make it available in other modules.
     */
    SystemLanguagesService,
  ],
})
export class SystemLanguagesModule {}
