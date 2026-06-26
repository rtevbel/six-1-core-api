import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CONFIG_OBJECT_VERIFICATION_URL_REGISTRY_KEY } from '../../../common/constants';
import { buildConfigObjectVerificationUrl } from '../../../config_objects/verification/config-object-verification-url.util';
import { parseVerificationUrlRegistryFromConfig } from '../../../config_objects/verification/config-object-verification-url.registry';
import type {
  NotificationContext,
  NotificationEntityRefs,
} from '../notification-context.types';
import {
  type NormalizedNotificationContextSource,
  parseOptionalPositiveInt,
} from '../notification-context-source.util';
import { buildNotificationPublicUrl, getNotificationPublicBaseUrl } from '../notification-public-url.util';
import {
  readVerificationObjectTypeForUrl,
  readVerificationTokenForUrl,
} from '../notification-verification-url.util';

/**
 * Hydrates `urls.*` from payload ids and optional refs (no entity hydration).
 */
@Injectable()
export class NotificationUrlsContextProvider {
  constructor(private readonly configService: ConfigService) {}

  apply(
    context: NotificationContext,
    source: NormalizedNotificationContextSource,
    refs?: NotificationEntityRefs | null,
  ): void {
    const projectId =
      parseOptionalPositiveInt(source.payload.projectId) ??
      parseOptionalPositiveInt(source.payload.project_id) ??
      (source.entityType === 'project' ? source.entityId : null);
    const taskId =
      parseOptionalPositiveInt(source.payload.taskId) ??
      parseOptionalPositiveInt(source.payload.task_id) ??
      (source.entityType === 'task' ? source.entityId : null);
    const processInstanceId =
      refs?.processInstanceId ??
      context.process.instanceId ??
      parseOptionalPositiveInt(source.payload.processInstanceId) ??
      parseOptionalPositiveInt(source.payload.process_instance_id);

    context.urls.project = projectId
      ? buildNotificationPublicUrl(this.configService, `/projects/${projectId}`)
      : null;
    context.urls.task = taskId
      ? buildNotificationPublicUrl(this.configService, `/tasks/${taskId}`)
      : null;
    context.urls.processRunner = processInstanceId
      ? buildNotificationPublicUrl(
          this.configService,
          `/process-instances/${processInstanceId}/runner`,
        )
      : null;

    const instanceId =
      refs?.configObjectInstanceId ??
      parseOptionalPositiveInt(source.payload.configCustomObjectInstanceId) ??
      parseOptionalPositiveInt(source.payload.config_custom_object_instance_id);
    context.urls.objectInstance = instanceId
      ? buildNotificationPublicUrl(
          this.configService,
          `/object-instances/${instanceId}`,
        )
      : null;
  }

  /**
   * Hydrates `urls.verification` after entity fields may include verification meta.
   */
  applyVerificationUrl(
    context: NotificationContext,
    source: NormalizedNotificationContextSource,
  ): void {
    if (context.urls.verification) {
      return;
    }

    const token = readVerificationTokenForUrl(
      source.payload,
      context.entity.fields,
    );
    const objectType = readVerificationObjectTypeForUrl(
      source.payload,
      context,
      source,
    );
    if (!token || !objectType) {
      return;
    }

    context.urls.verification = buildConfigObjectVerificationUrl(
      getNotificationPublicBaseUrl(this.configService),
      objectType,
      token,
      parseVerificationUrlRegistryFromConfig(
        this.configService.get<string>(
          CONFIG_OBJECT_VERIFICATION_URL_REGISTRY_KEY,
        ),
      ),
    );
  }
}
