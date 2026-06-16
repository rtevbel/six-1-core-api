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
