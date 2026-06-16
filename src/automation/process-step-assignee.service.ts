import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ProcessInstanceStepAssigneeEntity } from '../process_instances/process_instance_steps/entities/process_instance_step_assignee.entity';
import type { ProcessStepAssigneeResolution } from '../process_instances/interfaces/process-step-assignee.interface';

@Injectable()
export class ProcessStepAssigneeService {
  constructor(
    @InjectRepository(ProcessInstanceStepAssigneeEntity)
    private readonly assigneeRepository: Repository<ProcessInstanceStepAssigneeEntity>,
  ) {}

  async resolveForStep(
    stepInstanceId: number,
    manager?: EntityManager,
  ): Promise<ProcessStepAssigneeResolution> {
    const repo = manager
      ? manager.getRepository(ProcessInstanceStepAssigneeEntity)
      : this.assigneeRepository;

    const rows = await repo.find({
      where: { stepInstanceId },
      order: { assignmentOrder: 'ASC', instanceStepAssigneeId: 'ASC' },
    });

    const assigneeIds = rows.map((row) => row.tenantUserId);
    return {
      assigneeIds,
      primaryAssigneeId: assigneeIds[0] ?? null,
    };
  }

  async loadAssigneesByStepIds(
    stepInstanceIds: number[],
  ): Promise<Map<number, ProcessInstanceStepAssigneeEntity[]>> {
    const map = new Map<number, ProcessInstanceStepAssigneeEntity[]>();
    if (!stepInstanceIds.length) {
      return map;
    }

    const rows = await this.assigneeRepository
      .createQueryBuilder('assignee')
      .where('assignee.stepInstanceId IN (:...stepInstanceIds)', {
        stepInstanceIds,
      })
      .orderBy('assignee.assignmentOrder', 'ASC')
      .addOrderBy('assignee.instanceStepAssigneeId', 'ASC')
      .getMany();

    for (const row of rows) {
      const list = map.get(row.stepInstanceId) ?? [];
      list.push(row);
      map.set(row.stepInstanceId, list);
    }

    return map;
  }
}
