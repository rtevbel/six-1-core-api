import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import { ScheduleScenarioEventEntity } from '../entities/schedule_scenario_event.entity';
import { ScheduleScenarioSnapshotEntity } from '../entities/schedule_scenario_snapshot.entity';
import { ScheduleScenarioEventKind } from '../constants';

@Injectable()
export class ScenarioAuditService {
  constructor(
    @InjectRepository(ScheduleScenarioEventEntity)
    private readonly eventRepo: Repository<ScheduleScenarioEventEntity>,
    @InjectRepository(ScheduleScenarioSnapshotEntity)
    private readonly snapshotRepo: Repository<ScheduleScenarioSnapshotEntity>,
  ) {}

  async appendEvent(input: {
    schedulingRequirementId: number;
    scheduleScenarioId?: number | null;
    actorUserId?: number | null;
    kind: ScheduleScenarioEventKind;
    payload?: Record<string, unknown> | null;
  }): Promise<ScheduleScenarioEventEntity> {
    const row = this.eventRepo.create({
      schedulingRequirementId: input.schedulingRequirementId,
      scheduleScenarioId: input.scheduleScenarioId ?? null,
      actorUserId: input.actorUserId ?? null,
      kind: input.kind,
      payload: input.payload ?? null,
    });
    return this.eventRepo.save(row);
  }

  async saveSnapshot(input: {
    scheduleScenarioId: number;
    schedulingRequirementId: number;
    revision: number;
    graphJson: Record<string, unknown>;
    createdBy?: number | null;
  }): Promise<ScheduleScenarioSnapshotEntity> {
    const row = this.snapshotRepo.create({
      scheduleScenarioId: input.scheduleScenarioId,
      schedulingRequirementId: input.schedulingRequirementId,
      revision: input.revision,
      graphJson: input.graphJson,
      createdBy: input.createdBy ?? null,
    });
    return this.snapshotRepo.save(row);
  }
}

export function assertRequirementOpen(status: string): void {
  if (status !== 'open') {
    throw new RpcException(
      `Scheduling requirement is ${status} and cannot be modified`,
    );
  }
}

export function assertScenarioEditable(status: string): void {
  if (status === 'archived' || status === 'final') {
    throw new RpcException(
      `Scenario status '${status}' does not allow planning mutations`,
    );
  }
}
