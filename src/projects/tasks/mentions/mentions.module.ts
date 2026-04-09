import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskMentionsService } from './mentions.service';
import { TaskMentionsController } from './mentions.controller';
import { TaskMentionsEntity } from './entities/mention.entity';

/**
 * MentionsModule is responsible for managing mentions.
 * It includes the controller and service for handling operations
 * related to mentions and integrates necessary configurations.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TaskMentionsEntity for TypeORM.
    TypeOrmModule.forFeature([TaskMentionsEntity]),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [TaskMentionsController],

  // Specifies the providers that contain the business logic.
  providers: [TaskMentionsService],

  // Specifies the providers that are exposed as API from this module.
  exports: [TaskMentionsService],
})
export class MentionsModule {}
