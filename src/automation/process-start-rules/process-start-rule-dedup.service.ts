import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessInstanceEntity } from '../../process_instances/entities/process_instance.entity';

export interface ActiveProcessLookupParams {
  tenantId: number;
  subjectType: string;
  subjectId: number;
  templateId: number;
  correlationId?: string | null;
  /** Skip when an active instance of this template already has context.tenantId. */
  contextTenantId?: number | null;
}

/**
 * Prevents duplicate active processes for the same subject + template (D5).
 */
@Injectable()
export class ProcessStartRuleDedupService {
  constructor(
    @InjectRepository(ProcessInstanceEntity)
    private readonly processRepository: Repository<ProcessInstanceEntity>,
  ) {}

  async findBlockingActiveProcess(
    params: ActiveProcessLookupParams,
  ): Promise<ProcessInstanceEntity | null> {
    const active = await this.processRepository.findOne({
      where: {
        tenantId: params.tenantId,
        subjectType: params.subjectType,
        subjectId: params.subjectId,
        processTemplateId: params.templateId,
        status: 'active',
      },
      order: { processInstanceId: 'DESC' },
    });

    if (active) {
      return active;
    }

    const contextTenantId = Number(params.contextTenantId);
    if (Number.isFinite(contextTenantId) && contextTenantId > 0) {
      const byContext = await this.processRepository
        .createQueryBuilder('p')
        .where('p.processTemplateId = :templateId', {
          templateId: params.templateId,
        })
        .andWhere('p.status = :status', { status: 'active' })
        .andWhere(
          `CAST(JSON_UNQUOTE(JSON_EXTRACT(p.context, '$.tenantId')) AS UNSIGNED) = :contextTenantId`,
          { contextTenantId },
        )
        .orderBy('p.processInstanceId', 'DESC')
        .getOne();

      if (byContext) {
        return byContext;
      }
    }

    if (!params.correlationId?.trim()) {
      return null;
    }

    return this.processRepository.findOne({
      where: {
        tenantId: params.tenantId,
        processTemplateId: params.templateId,
        correlationId: params.correlationId.trim(),
        status: 'active',
      },
      order: { processInstanceId: 'DESC' },
    });
  }
}
