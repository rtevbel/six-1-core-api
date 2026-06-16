import { RpcException } from '@nestjs/microservices';
import type { Repository } from 'typeorm';
import { isProcessSubjectType } from '../automation/process-subject.constants';
import { PROCESS_START_RULE_SUBJECT_ID_WORKFLOW_SELF } from './constants';
import { PROCESS_SUBJECT_TYPE_WORKFLOW } from '../automation/process-subject.constants';
import type { CreateProcessStartRuleDto } from './dto/create-process_start_rule.dto';
import { ProcessTemplateEntity } from '../process_templates/entities/process_template.entity';

type RuleInput = Pick<
  CreateProcessStartRuleDto,
  'eventName' | 'templateId' | 'subjectType' | 'subjectIdSource'
> & { tenantId?: number };

export async function assertProcessStartRuleAllowed(
  templateRepository: Repository<ProcessTemplateEntity>,
  params: RuleInput,
): Promise<void> {
  if (!params.eventName.trim().startsWith('six1-event.')) {
    throw new RpcException('event_name must be a canonical six1-event.* name');
  }

  if (!isProcessSubjectType(params.subjectType)) {
    throw new RpcException(`Unsupported subject_type: ${params.subjectType}`);
  }

  if (
    params.subjectIdSource === PROCESS_START_RULE_SUBJECT_ID_WORKFLOW_SELF &&
    params.subjectType !== PROCESS_SUBJECT_TYPE_WORKFLOW
  ) {
    throw new RpcException(
      'workflow_self subject_id_source requires subject_type workflow',
    );
  }

  const template = await templateRepository.findOne({
    where: { processTemplateId: params.templateId },
  });

  if (!template) {
    throw new RpcException('Process template not found');
  }

  const ruleTenantId =
    typeof params.tenantId === 'number' && params.tenantId > 0
      ? params.tenantId
      : null;
  if (
    ruleTenantId != null &&
    template.tenantId > 0 &&
    template.tenantId !== ruleTenantId
  ) {
    throw new RpcException(
      'Process template tenant does not match rule tenant',
    );
  }
}
