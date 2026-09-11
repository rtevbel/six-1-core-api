import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ScheduleScenarioStatus } from '../constants';
import { SchedulingRequirementEntity } from './scheduling_requirement.entity';

@Entity('schedule_scenarios')
export class ScheduleScenarioEntity {
  @PrimaryGeneratedColumn({
    name: 'schedule_scenario_id',
    type: 'bigint',
    unsigned: true,
  })
  scheduleScenarioId!: number;

  @Index('idx_scenario_requirement')
  @Column({
    name: 'scheduling_requirement_id',
    type: 'bigint',
    unsigned: true,
  })
  schedulingRequirementId!: number;

  @Index('idx_scenario_tenant')
  @Column({ name: 'tenant_id', type: 'bigint', unsigned: true })
  tenantId!: number;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Index('idx_scenario_status')
  @Column({
    name: 'status',
    type: 'enum',
    enum: ['draft', 'active', 'archived', 'final'],
    default: 'draft',
  })
  status!: ScheduleScenarioStatus;

  @Column({
    name: 'parent_scenario_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  parentScenarioId!: number | null;

  @Column({
    name: 'revision',
    type: 'int',
    unsigned: true,
    default: 1,
  })
  revision!: number;

  @Column({
    name: 'based_on_live_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  basedOnLiveAt!: Date | null;

  @Column({
    name: 'promoted_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  promotedAt!: Date | null;

  @Column({
    name: 'promoted_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  promotedBy!: number | null;

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

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    precision: 6,
  })
  updatedAt!: Date;

  @ManyToOne(() => SchedulingRequirementEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheduling_requirement_id' })
  requirement!: SchedulingRequirementEntity;
}
