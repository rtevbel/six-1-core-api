import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsSelect } from 'typeorm';
import { Repository } from 'typeorm';
import { ProcessInstanceEntity } from '../../process_instances/entities/process_instance.entity';
import { ProcessInstanceStepEntity } from '../../process_instances/process_instance_steps/entities/process_instance_step.entity';

/**
 * Lightweight loader for notification process/workflow context (NV3).
 */
@Injectable()
export class NotificationProcessContextLoader {
  constructor(
    @InjectRepository(ProcessInstanceEntity)
    private readonly processRepository: Repository<ProcessInstanceEntity>,
    @InjectRepository(ProcessInstanceStepEntity)
    private readonly stepRepository: Repository<ProcessInstanceStepEntity>,
  ) {}

  async loadProcessInstance(
    processInstanceId: number,
  ): Promise<ProcessInstanceEntity | null> {
    return this.processRepository.findOne({
      where: { processInstanceId },
      select: {
        processInstanceId: true,
        processTemplateId: true,
        status: true,
        subjectType: true,
        subjectId: true,
        // TypeORM's `FindOptionsSelect` is picky for JSON columns under strict TS.
        context: true as unknown as FindOptionsSelect<ProcessInstanceEntity>['context'],
      } as FindOptionsSelect<ProcessInstanceEntity>,
    });
  }

  async loadStepInstance(
    stepInstanceId: number,
  ): Promise<ProcessInstanceStepEntity | null> {
    return this.stepRepository.findOne({
      where: { stepInstanceId },
      select: {
        stepInstanceId: true,
        processInstanceId: true,
        name: true,
        stepOrder: true,
        status: true,
      },
    });
  }
}
