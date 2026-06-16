import { RpcException } from '@nestjs/microservices';
import type { Repository } from 'typeorm';
import { NO_RECORD_FOUND_MESSAGE } from '../../../common/constants';
import {
  getEffectiveTenantId,
  isProcessTemplateStepTenantAccessible,
} from '../../../common/utils/tenant-scope.util';
import { ProcessTemplateStepEntity } from '../entities/process_template_step.entity';

export async function assertProcessTemplateStepAssigneeAllowed(
  stepRepository: Repository<ProcessTemplateStepEntity>,
  params: {
    processTemplateStepId: number;
    tenantId?: number;
  },
): Promise<ProcessTemplateStepEntity> {
  const step = await stepRepository.findOne({
    where: { processTemplateStepId: params.processTemplateStepId },
    relations: ['processTemplate'],
  });

  if (!step?.processTemplate) {
    throw new RpcException(
      NO_RECORD_FOUND_MESSAGE.replace('{entity_name}', 'ProcessTemplateStep'),
    );
  }

  const effectiveTenantId = getEffectiveTenantId(params.tenantId);
  const templateTenantId = step.processTemplate.tenantId;

  if (
    !isProcessTemplateStepTenantAccessible(templateTenantId, effectiveTenantId)
  ) {
    throw new RpcException(
      NO_RECORD_FOUND_MESSAGE.replace('{entity_name}', 'ProcessTemplateStep'),
    );
  }

  return step;
}
