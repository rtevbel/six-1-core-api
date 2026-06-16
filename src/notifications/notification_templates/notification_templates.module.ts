import { Module } from '@nestjs/common';
import { NotificationTemplatesService } from './notification_templates.service';
import { NotificationTemplatesController } from './notification_templates.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationTemplateEntity } from './entities/notification_template.entity';
import { NotificationCatalogModule } from '../catalog/notification-catalog.module';

/**
 * NotificationTemplatesModule is responsible for managing notification templates.
 * It includes the controller and service for handling operations related to notification templates.
 *
 * @version 0.0.1
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationTemplateEntity]),
    NotificationCatalogModule,
  ],
  controllers: [NotificationTemplatesController],
  providers: [NotificationTemplatesService],
  exports: [NotificationTemplatesService],
})
export class NotificationTemplatesModule {}
