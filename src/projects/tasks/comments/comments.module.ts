import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { TaskCommentsEntity } from './entities/comment.entity';

/**
 * CommentsModule is responsible for managing comments.
 * It includes the controller and service for handling operations
 * related to comments and integrates necessary configurations.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TaskCommentsEntity for TypeORM.
    TypeOrmModule.forFeature([TaskCommentsEntity]),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [CommentsController],

  // Specifies the providers that contain the business logic.
  providers: [CommentsService],

  // Specifies the providers that are exposed as API from this module.
  exports: [CommentsService],
})
export class CommentsModule {}
