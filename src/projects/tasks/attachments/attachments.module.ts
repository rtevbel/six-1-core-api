import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskAttachmentsService } from './attachments.service';
import { TaskAttachmentsController } from './attachments.controller';
import { TaskAttachmentsEntity } from './entities/attachment.entity';
import { StorageModule } from '../../../storage/storage.module';

/**
 * AttachmentsModule is responsible for managing task attachments.
 */
@Module({
  imports: [TypeOrmModule.forFeature([TaskAttachmentsEntity]), StorageModule],
  controllers: [TaskAttachmentsController],
  providers: [TaskAttachmentsService],
  exports: [TaskAttachmentsService],
})
export class AttachmentsModule {}
