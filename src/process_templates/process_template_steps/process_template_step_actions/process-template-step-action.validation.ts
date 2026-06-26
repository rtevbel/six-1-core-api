import { RpcException } from '@nestjs/microservices';
import type { Repository } from 'typeorm';
import {
  isProcessStepActionRunOn,
  isProcessStepActionType,
  PROCESS_STEP_ACTION_TYPE_GENERATE_VERIFICATION_TOKEN,
  PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION,
  PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD,
  type ProcessStepActionRunOn,
  type ProcessStepActionType,
} from '../../../automation/process-step-action.constants';
import {
  parseProcessStepActionConfig,
  type ProcessStepActionConfig,
} from '../../../automation/process-step-action.types';
import { NO_RECORD_FOUND_MESSAGE } from '../../../common/constants';
import {
  getEffectiveTenantId,
  isProcessTemplateStepTenantAccessible,
} from '../../../common/utils/tenant-scope.util';
import { ConfigObjectEntity } from '../../../config_objects/entities/config_object.entity';
import { SOR_BOUND_OBJECT_TYPE_ENTITIES } from '../../../config_objects/sor-bound-object-type-entities';
import { NotificationTemplateEntity } from '../../../notifications/notification_templates/entities/notification_template.entity';
import { ProcessTemplateStepEntity } from '../entities/process_template_step.entity';

export async function assertProcessTemplateStepActionAllowed(
  stepRepository: Repository<ProcessTemplateStepEntity>,
  configObjectRepository: Repository<ConfigObjectEntity>,
  notificationTemplateRepository: Repository<NotificationTemplateEntity>,
  params: {
    processTemplateStepId: number;
    actionType: ProcessStepActionType;
    runOn: ProcessStepActionRunOn;
    config: unknown;
    tenantId?: number;
  },
): Promise<void> {
  if (!isProcessStepActionType(params.actionType)) {
    throw new RpcException(`Invalid action_type: ${params.actionType}`);
  }
  if (!isProcessStepActionRunOn(params.runOn)) {
    throw new RpcException(`Invalid run_on: ${params.runOn}`);
  }

  const parsedConfig = parseProcessStepActionConfig(
    params.actionType,
    params.config,
  );
  if (!parsedConfig) {
    throw new RpcException('Invalid action config for action_type.');
  }

  const step = await stepRepository.findOne({
    where: { processTemplateStepId: params.processTemplateStepId },
    relations: ['processTemplate'],
  });
  if (!step) {
    throw new RpcException(
      NO_RECORD_FOUND_MESSAGE.replace(
        '{entity_name}',
        ProcessTemplateStepEntity.name,
      ),
    );
  }

  const effectiveTenantId = getEffectiveTenantId(params.tenantId);
  const templateTenantId = step.processTemplate?.tenantId;
  if (
    !isProcessTemplateStepTenantAccessible(templateTenantId, effectiveTenantId)
  ) {
    throw new RpcException(
      'Process template step is not accessible for this tenant',
    );
  }

  await assertProcessStepActionConfigObjectScope(
    configObjectRepository,
    notificationTemplateRepository,
    params.actionType,
    parsedConfig,
    templateTenantId,
  );
}

async function assertProcessStepActionConfigObjectScope(
  configObjectRepository: Repository<ConfigObjectEntity>,
  notificationTemplateRepository: Repository<NotificationTemplateEntity>,
  actionType: ProcessStepActionType,
  config: ProcessStepActionConfig,
  templateTenantId: number | null | undefined,
): Promise<void> {
  if (actionType === PROCESS_STEP_ACTION_TYPE_UPDATE_SOR_FIELD) {
    await assertUpdateSorFieldConfigScope(
      configObjectRepository,
      config,
      templateTenantId,
    );
    return;
  }

  if (actionType === PROCESS_STEP_ACTION_TYPE_GENERATE_VERIFICATION_TOKEN) {
    await assertGenerateVerificationTokenConfigScope(
      configObjectRepository,
      config,
      templateTenantId,
    );
    return;
  }

  if (actionType === PROCESS_STEP_ACTION_TYPE_SEND_NOTIFICATION) {
    await assertSendNotificationConfigScope(
      notificationTemplateRepository,
      config,
    );
  }
}

async function assertUpdateSorFieldConfigScope(
  configObjectRepository: Repository<ConfigObjectEntity>,
  config: ProcessStepActionConfig,
  templateTenantId: number | null | undefined,
): Promise<void> {
  if (!('objectType' in config)) {
    return;
  }

  const objectType = config.objectType;
  if (!(objectType in SOR_BOUND_OBJECT_TYPE_ENTITIES)) {
    throw new RpcException(
      `object_type "${objectType}" is not supported for update_sor_field actions`,
    );
  }

  if (typeof templateTenantId !== 'number' || templateTenantId <= 0) {
    return;
  }

  const configObject = await configObjectRepository.findOne({
    where: { objectType },
    relations: ['templateSet'],
    order: { configObjectId: 'ASC' },
  });

  if (!configObject) {
    throw new RpcException(
      `No config object found for object type "${objectType}".`,
    );
  }

  const objectTenantId = configObject.templateSet?.tenantId ?? null;
  if (
    objectTenantId != null &&
    objectTenantId > 0 &&
    objectTenantId !== templateTenantId
  ) {
    throw new RpcException(
      'Config object tenant does not match process template tenant',
    );
  }
}

async function assertGenerateVerificationTokenConfigScope(
  configObjectRepository: Repository<ConfigObjectEntity>,
  config: ProcessStepActionConfig,
  templateTenantId: number | null | undefined,
): Promise<void> {
  if (!('objectType' in config) || !('coreIdPath' in config)) {
    return;
  }

  const objectType = config.objectType;
  if (!(objectType in SOR_BOUND_OBJECT_TYPE_ENTITIES)) {
    throw new RpcException(
      `object_type "${objectType}" is not supported for generate_verification_token actions`,
    );
  }

  if (typeof templateTenantId !== 'number' || templateTenantId <= 0) {
    return;
  }

  const configObject = await configObjectRepository.findOne({
    where: { objectType },
    relations: ['templateSet'],
    order: { configObjectId: 'ASC' },
  });

  if (!configObject) {
    throw new RpcException(
      `No config object found for object type "${objectType}".`,
    );
  }

  const objectTenantId = configObject.templateSet?.tenantId ?? null;
  if (
    objectTenantId != null &&
    objectTenantId > 0 &&
    objectTenantId !== templateTenantId
  ) {
    throw new RpcException(
      'Config object tenant does not match process template tenant',
    );
  }
}

async function assertSendNotificationConfigScope(
  notificationTemplateRepository: Repository<NotificationTemplateEntity>,
  config: ProcessStepActionConfig,
): Promise<void> {
  if (!('templateId' in config) || !('channelId' in config)) {
    return;
  }

  const template = await notificationTemplateRepository.findOne({
    where: { templateId: config.templateId },
  });

  if (!template) {
    throw new RpcException('Notification template not found');
  }

  if (template.channelId !== config.channelId) {
    throw new RpcException(
      'Notification template does not belong to the configured channel',
    );
  }
}
