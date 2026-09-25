import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ScheduleConstraintEventAction =
  | 'detected'
  | 'applied_with_issues'
  | 'resolved'
  | 'overridden';

export type ScheduleConstraintEventActorType = 'human' | 'system' | 'ai';

/**
 * Append-only conflict/resolution audit. Never the source for Needs attention KPI.
 */
@Entity('schedule_constraint_events')
@Index('idx_sce_tenant_created', ['tenantId', 'createdAt'])
@Index('idx_sce_scenario_created', ['scheduleScenarioId', 'createdAt'])
@Index('idx_sce_tenant_action', ['tenantId', 'action'])
export class ScheduleConstraintEventEntity {
  @PrimaryGeneratedColumn({
    name: 'schedule_constraint_event_id',
    type: 'bigint',
    unsigned: true,
  })
  scheduleConstraintEventId!: number;

  @Column({ name: 'tenant_id', type: 'bigint', unsigned: true })
  tenantId!: number;

  @Column({
    name: 'scheduling_requirement_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  schedulingRequirementId!: number | null;

  @Column({
    name: 'schedule_scenario_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  scheduleScenarioId!: number | null;

  @Column({
    name: 'action',
    type: 'enum',
    enum: ['detected', 'applied_with_issues', 'resolved', 'overridden'],
  })
  action!: ScheduleConstraintEventAction;

  @Column({ name: 'conflict_codes', type: 'json' })
  conflictCodes!: string[];

  @Column({ name: 'task_ids', type: 'json' })
  taskIds!: number[];

  @Column({ name: 'resource_ids', type: 'json', nullable: true })
  resourceIds!: number[] | null;

  @Column({ name: 'before_windows', type: 'json', nullable: true })
  beforeWindows!: Record<string, unknown> | null;

  @Column({ name: 'after_windows', type: 'json', nullable: true })
  afterWindows!: Record<string, unknown> | null;

  @Column({
    name: 'actor_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  actorId!: number | null;

  @Column({
    name: 'actor_type',
    type: 'enum',
    enum: ['human', 'system', 'ai'],
    default: 'human',
  })
  actorType!: ScheduleConstraintEventActorType;

  @Column({ name: 'reason', type: 'varchar', length: 512, nullable: true })
  reason!: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
  })
  createdAt!: Date;
}
