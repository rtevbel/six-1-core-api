import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ScheduleScenarioEntity } from './schedule_scenario.entity';
import { ScenarioPlannedShiftEntity } from './scenario_planned_shift.entity';
import { ScenarioResourceAssignmentEntity } from './scenario_resource_assignment.entity';

@Entity('scenario_planned_tasks')
@Unique('uq_scenario_planned_task', ['scheduleScenarioId', 'taskId'])
export class ScenarioPlannedTaskEntity {
  @PrimaryGeneratedColumn({
    name: 'scenario_planned_task_id',
    type: 'bigint',
    unsigned: true,
  })
  scenarioPlannedTaskId!: number;

  @Index('idx_spt_scenario')
  @Column({
    name: 'schedule_scenario_id',
    type: 'bigint',
    unsigned: true,
  })
  scheduleScenarioId!: number;

  @Index('idx_spt_task')
  @Column({ name: 'task_id', type: 'bigint', unsigned: true })
  taskId!: number;

  @Column({
    name: 'planned_start_utc',
    type: 'datetime',
    precision: 6,
  })
  plannedStartUtc!: Date;

  @Column({
    name: 'planned_end_utc',
    type: 'datetime',
    precision: 6,
  })
  plannedEndUtc!: Date;

  @Column({
    name: 'tz_used',
    type: 'varchar',
    length: 50,
    default: 'UTC',
  })
  tzUsed!: string;

  @Column({
    name: 'priority',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  priority!: number;

  @Column({
    name: 'task_status_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  taskStatusId!: number | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'constraint_snapshot', type: 'json', nullable: true })
  constraintSnapshot!: Record<string, unknown> | null;

  @Column({ name: 'conflict_summary', type: 'json', nullable: true })
  conflictSummary!: Record<string, unknown> | null;

  @ManyToOne(() => ScheduleScenarioEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_scenario_id' })
  scenario!: ScheduleScenarioEntity;

  @OneToMany(() => ScenarioPlannedShiftEntity, (s) => s.plannedTask)
  shifts!: ScenarioPlannedShiftEntity[];

  @OneToMany(() => ScenarioResourceAssignmentEntity, (a) => a.plannedTask)
  assignments!: ScenarioResourceAssignmentEntity[];
}
