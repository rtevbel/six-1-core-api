import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ScenarioPlannedTaskEntity } from './scenario_planned_task.entity';

@Entity('scenario_resource_assignments')
export class ScenarioResourceAssignmentEntity {
  @PrimaryGeneratedColumn({
    name: 'scenario_resource_assignment_id',
    type: 'bigint',
    unsigned: true,
  })
  scenarioResourceAssignmentId!: number;

  @Index('idx_sra_planned_task')
  @Column({
    name: 'scenario_planned_task_id',
    type: 'bigint',
    unsigned: true,
  })
  scenarioPlannedTaskId!: number;

  @Index('idx_sra_resource')
  @Column({ name: 'resource_id', type: 'bigint', unsigned: true })
  resourceId!: number;

  @Column({
    name: 'scenario_planned_shift_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  scenarioPlannedShiftId!: number | null;

  @Column({ name: 'assigned_start', type: 'datetime', precision: 6 })
  assignedStart!: Date;

  @Column({ name: 'assigned_end', type: 'datetime', precision: 6 })
  assignedEnd!: Date;

  @ManyToOne(() => ScenarioPlannedTaskEntity, (t) => t.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scenario_planned_task_id' })
  plannedTask!: ScenarioPlannedTaskEntity;
}
