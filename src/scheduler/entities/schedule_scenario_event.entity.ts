import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ScheduleScenarioEventKind } from '../constants';

@Entity('schedule_scenario_events')
export class ScheduleScenarioEventEntity {
  @PrimaryGeneratedColumn({
    name: 'event_id',
    type: 'bigint',
    unsigned: true,
  })
  eventId!: number;

  @Index('idx_sse_scenario')
  @Column({
    name: 'schedule_scenario_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  scheduleScenarioId!: number | null;

  @Index('idx_sse_requirement')
  @Column({
    name: 'scheduling_requirement_id',
    type: 'bigint',
    unsigned: true,
  })
  schedulingRequirementId!: number;

  @Column({
    name: 'actor_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  actorUserId!: number | null;

  @Column({
    name: 'kind',
    type: 'enum',
    enum: [
      'created',
      'forked',
      'updated',
      'status_changed',
      'item_moved',
      'compared',
      'promoted',
      'archived',
      'conflict_checked',
    ],
  })
  kind!: ScheduleScenarioEventKind;

  @Column({ name: 'payload', type: 'json', nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
  })
  createdAt!: Date;
}
