import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPlatformFlagsService } from '../config/notification-platform-flags.service';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { UsersModule } from '../../users/users.module';
import { ConfigObjectsModule } from '../../config_objects/config_objects.module';
import { NotificationContextBuilderService } from './notification-context-builder.service';
import { BuiltinNamespaceProvider } from './providers/builtin-namespace.provider';
import { ActorRecipientProvider } from './providers/actor-recipient.provider';
import { TenantContextProvider } from './providers/tenant-context.provider';
import { NotificationUrlsContextProvider } from './providers/notification-urls-context.provider';
import { ConfigObjectVariableProvider } from './providers/config-object-variable.provider';
import { ProcessContextProvider } from './providers/process-context.provider';
import { WorkflowContextProvider } from './providers/workflow-context.provider';
import { NotificationProcessContextLoader } from './notification-process-context.loader';
import { ProcessInstanceEntity } from '../../process_instances/entities/process_instance.entity';
import { ProcessInstanceStepEntity } from '../../process_instances/process_instance_steps/entities/process_instance_step.entity';

/**
 * Notification Variable Platform — context types, manifest, builder, and flags.
 */
@Module({
  imports: [
    ConfigModule,
    UsersModule,
    ConfigObjectsModule,
    TypeOrmModule.forFeature([
      TenantEntity,
      ProcessInstanceEntity,
      ProcessInstanceStepEntity,
    ]),
  ],
  providers: [
    NotificationPlatformFlagsService,
    BuiltinNamespaceProvider,
    ActorRecipientProvider,
    TenantContextProvider,
    NotificationUrlsContextProvider,
    NotificationProcessContextLoader,
    ProcessContextProvider,
    WorkflowContextProvider,
    ConfigObjectVariableProvider,
    NotificationContextBuilderService,
  ],
  exports: [
    NotificationPlatformFlagsService,
    NotificationContextBuilderService,
    ConfigObjectVariableProvider,
  ],
})
export class NotificationContextModule {}
