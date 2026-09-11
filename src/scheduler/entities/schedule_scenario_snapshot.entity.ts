import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('schedule_scenario_snapshots')
export class ScheduleScenarioSnapshotEntity {
  @PrimaryGeneratedColumn({
    name: 'snapshot_id',
    type: 'bigint',
    unsigned: true,
  })
  snapshotId!: number;

  @Index('idx_sss_scenario')
  @Column({
    name: 'schedule_scenario_id',
    type: 'bigint',
    unsigned: true,
  })
  scheduleScenarioId!: number;

  @Column({
    name: 'scheduling_requirement_id',
    type: 'bigint',
    unsigned: true,
  })
  schedulingRequirementId!: number;

  @Column({ name: 'revision', type: 'int', unsigned: true })
  revision!: number;

  @Column({ name: 'graph_json', type: 'json' })
  graphJson!: Record<string, unknown>;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  createdBy!: number | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
  })
  createdAt!: Date;
}
