import { Module, forwardRef } from '@nestjs/common';
import { UserMetaService } from './user-meta.service';
import { UserMetaController } from './user-meta.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMetaEntity } from './entities/user-meta.entity';
import { ConfigObjectsModule } from '../../config_objects/config_objects.module';

/**
 * UserMetaModule is responsible for managing user metadata.
 * It includes the controller and service for handling operations
 * related to user metadata.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the UserMetaEntity for TypeORM.
    TypeOrmModule.forFeature([UserMetaEntity]),
    forwardRef(() => ConfigObjectsModule),
  ],

  // Specifies the controllers that handle incoming requests.
  controllers: [UserMetaController],

  // Specifies the providers that contain the business logic.
  providers: [UserMetaService],

  // Exports the service to make it available for other modules.
  exports: [UserMetaService],
})
export class UserMetaModule {}
