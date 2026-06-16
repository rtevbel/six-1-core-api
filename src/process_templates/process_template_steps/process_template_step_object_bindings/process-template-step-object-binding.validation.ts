import { RpcException } from '@nestjs/microservices';
import type { Repository } from 'typeorm';
import {
  PROCESS_TEMPLATE_OBJECT_BINDING_MODE_USE_EXISTING,
  PROCESS_TEMPLATE_OBJECT_BINDING_MODES_V1,
  PROCESS_CONFIG_OBJECT_CORE_LINKED_BINDING_MODES,
  type ProcessTemplateObjectBindingMode,
} from '../../../automation/process-step-object-binding.constants';
import { ConfigObjectEntity } from '../../../config_objects/entities/config_object.entity';
import { ProcessTemplateStepEntity } from '../entities/process_template_step.entity';

const CORE_LINKED_CONFIG_BINDING_MODES = new Set<string>(
  PROCESS_CONFIG_OBJECT_CORE_LINKED_BINDING_MODES,
);

export async function assertProcessTemplateStepObjectBindingAllowed(
  stepRepository: Repository<ProcessTemplateStepEntity>,
  configObjectRepository: Repository<ConfigObjectEntity>,
  params: {
    processTemplateStepId: number;
    configObjectId: number;
    bindingMode: ProcessTemplateObjectBindingMode;
  },
): Promise<void> {
  if (params.bindingMode === PROCESS_TEMPLATE_OBJECT_BINDING_MODE_USE_EXISTING) {
    // use_existing is validated after config object load (core-linked only).
  } else if (!PROCESS_TEMPLATE_OBJECT_BINDING_MODES_V1.includes(params.bindingMode)) {
    throw new RpcException(
      `binding_mode "${params.bindingMode}" is not supported in v1; use create_on_enter`,
    );
  }

  const step = await stepRepository.findOne({
    where: { processTemplateStepId: params.processTemplateStepId },
    relations: ['processTemplate'],
  });

  if (!step) {
    throw new RpcException('Process template step not found');
  }

  const configObject = await configObjectRepository.findOne({
    where: { configObjectId: params.configObjectId },
    relations: ['templateSet'],
  });

  if (!configObject) {
    throw new RpcException('Config object not found');
  }

  if (
    params.bindingMode === PROCESS_TEMPLATE_OBJECT_BINDING_MODE_USE_EXISTING &&
    !CORE_LINKED_CONFIG_BINDING_MODES.has(configObject.bindingMode)
  ) {
    throw new RpcException(
      'use_existing binding mode is only supported for sor_bound and system_table config objects',
    );
  }

  const templateTenantId = step.processTemplate?.tenantId;
  const objectTenantId = configObject.templateSet?.tenantId ?? null;

  if (
    templateTenantId != null &&
    templateTenantId > 0 &&
    objectTenantId != null &&
    objectTenantId > 0 &&
    templateTenantId !== objectTenantId
  ) {
    throw new RpcException(
      'Config object tenant does not match process template tenant',
    );
  }
}
