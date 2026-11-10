import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ScheduleScenarioEntity } from './schedule_scenario.entity';
import { ManageRecordCategory } from '../constants';

@Entity('schedule_scenario_manage_records')
@Unique('uq_ssmr_scenario_record_key', ['scheduleScenarioId', 'recordKey'])
@Index('idx_ssmr_tenant_scenario', ['tenantId', 'scheduleScenarioId'])
@Index('idx_ssmr_scenario_category', ['scheduleScenarioId', 'category'])
export class ScheduleScenarioManageRecordEntity {
  @PrimaryGeneratedColumn({
    name: 'schedule_scenario_manage_record_id',
    type: 'bigint',
    unsigned: true,
  })
  scheduleScenarioManageRecordId!: number;

  @Column({ name: 'tenant_id', type: 'bigint', unsigned: true })
  tenantId!: number;

  @Column({
    name: 'schedule_scenario_id',
    type: 'bigint',
    unsigned: true,
  })
  scheduleScenarioId!: number;

  @Column({
    name: 'category',
    type: 'enum',
    enum: ['project', 'person', 'team', 'partner', 'equipment', 'material'],
  })
  category!: ManageRecordCategory;

  @Column({ name: 'record_key', type: 'char', length: 36 })
  recordKey!: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({
    name: 'parent_record_key',
    type: 'char',
    length: 36,
    nullable: true,
  })
  parentRecordKey!: string | null;

  @Column({
    name: 'linked_master_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  linkedMasterId!: number | null;

  @Column({ name: 'attrs', type: 'json' })
  attrs!: Record<string, unknown>;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  createdBy!: number | null;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  updatedBy!: number | null;

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

  @ManyToOne(() => ScheduleScenarioEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_scenario_id' })
  scenario!: ScheduleScenarioEntity;
}
