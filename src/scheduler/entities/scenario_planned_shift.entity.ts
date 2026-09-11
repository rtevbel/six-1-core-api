import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ScenarioPlannedTaskEntity } from './scenario_planned_task.entity';

@Entity('scenario_planned_shifts')
@Unique('uq_scenario_planned_shift_seq', [
  'scenarioPlannedTaskId',
  'sequenceNo',
])
export class ScenarioPlannedShiftEntity {
  @PrimaryGeneratedColumn({
    name: 'scenario_planned_shift_id',
    type: 'bigint',
    unsigned: true,
  })
  scenarioPlannedShiftId!: number;

  @Index('idx_sps_planned_task')
  @Column({
    name: 'scenario_planned_task_id',
    type: 'bigint',
    unsigned: true,
  })
  scenarioPlannedTaskId!: number;

  @Column({
    name: 'sequence_no',
    type: 'int',
    unsigned: true,
    default: 1,
  })
  sequenceNo!: number;

  @Column({
    name: 'tenant_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  tenantUserId!: number | null;

  @Column({
    name: 'resource_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  resourceId!: number | null;

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

  @ManyToOne(() => ScenarioPlannedTaskEntity, (t) => t.shifts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scenario_planned_task_id' })
  plannedTask!: ScenarioPlannedTaskEntity;
}
