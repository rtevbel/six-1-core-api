import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ScheduleScenarioEntity } from './schedule_scenario.entity';

@Entity('schedule_scenario_versions')
@Unique('uq_scenario_version', ['scheduleScenarioId', 'version'])
@Index('idx_ssv_tenant', ['tenantId'])
@Index('idx_ssv_scenario_version_desc', ['scheduleScenarioId', 'version'])
export class ScheduleScenarioVersionEntity {
  @PrimaryGeneratedColumn({
    name: 'schedule_scenario_version_id',
    type: 'bigint',
    unsigned: true,
  })
  scheduleScenarioVersionId!: number;

  @Column({ name: 'tenant_id', type: 'bigint', unsigned: true })
  tenantId!: number;

  @Column({
    name: 'schedule_scenario_id',
    type: 'bigint',
    unsigned: true,
  })
  scheduleScenarioId!: number;

  @Column({ name: 'version', type: 'int', unsigned: true })
  version!: number;

  @Column({ name: 'summary', type: 'varchar', length: 512 })
  summary!: string;

  @Column({ name: 'content_hash', type: 'varchar', length: 64 })
  contentHash!: string;

  /** Overlay-only JSON — never full master project/resource dumps. */
  @Column({ name: 'overlay_json', type: 'json' })
  overlayJson!: Record<string, unknown>;

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

  @ManyToOne(() => ScheduleScenarioEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_scenario_id' })
  scenario!: ScheduleScenarioEntity;
}
