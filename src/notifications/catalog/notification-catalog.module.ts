import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigObjectsModule } from '../../config_objects/config_objects.module';
import { EventLogsModule } from '../../events/event_logs/event_logs.module';
import { UsersModule } from '../../users/users.module';
import { NotificationContextModule } from '../context/notification-context.module';
import { NotificationUrlBuilderService } from '../services/notification-url-builder.service';
import { NotificationVariableResolverService } from '../services/notification-variable-resolver.service';
import { NotificationTemplateEngineService } from '../template-engine/notification-template-engine.service';
import { NotificationVariableCatalogService } from './notification-variable-catalog.service';
import { NotificationTemplateValidationService } from './notification-template-validation.service';
import { NotificationTemplatePreviewService } from './notification-template-preview.service';

/**
 * Notification variable catalog, preview, and template validation (NV5).
 */
@Module({
  imports: [
    ConfigModule,
    ConfigObjectsModule,
    NotificationContextModule,
    UsersModule,
    forwardRef(() => EventLogsModule),
  ],
  providers: [
    NotificationUrlBuilderService,
    NotificationVariableResolverService,
    NotificationTemplateEngineService,
    NotificationVariableCatalogService,
    NotificationTemplateValidationService,
    NotificationTemplatePreviewService,
  ],
  exports: [
    NotificationTemplateEngineService,
    NotificationVariableCatalogService,
    NotificationTemplateValidationService,
    NotificationTemplatePreviewService,
  ],
})
export class NotificationCatalogModule {}
