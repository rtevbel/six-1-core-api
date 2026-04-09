import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskAttachmentsService } from './attachments.service';
import { TaskAttachmentsController } from './attachments.controller';
import { TaskAttachmentsEntity } from './entities/attachment.entity';

/**
 * AttachmentsModule is responsible for managing task attachments.
 * It includes the controller and service for handling operations
 * related to attachments and integrates necessary configurations.
 *
 * @version 0.0.1
 */
@Module({
  // Imports required modules and configurations.
  imports: [
    // Registers the TaskAttachmentsEntity for TypeORM.
    TypeOrmModule.forFeature([TaskAttachmentsEntity]),
  ],
  // Specifies the controllers that handle incoming requests.
  controllers: [TaskAttachmentsController],

  // Specifies the providers that contain the business logic.
  providers: [TaskAttachmentsService],

  // Specifies the providers that are exposed as API from this module.
  exports: [TaskAttachmentsService],
})
export class AttachmentsModule {}
