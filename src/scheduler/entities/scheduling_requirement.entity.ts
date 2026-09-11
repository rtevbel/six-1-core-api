import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  SchedulingRequirementScopeType,
  SchedulingRequirementStatus,
} from '../constants';

export interface SchedulingPromotePolicy {
  promoteFrom: 'active_only';
  inFlight: 'block' | 'force_cancel';
  scope: 'horizon_and_members_only';
  outsideScopeLive: 'leave_untouched';
  allowHardConflictOverride: boolean;
  archiveOtherDraftsOnPromote: boolean;
  includeTerminal?: boolean;
}

export const DEFAULT_PROMOTE_POLICY: SchedulingPromotePolicy = {
  promoteFrom: 'active_only',
  inFlight: 'block',
  scope: 'horizon_and_members_only',
  outsideScopeLive: 'leave_untouched',
  allowHardConflictOverride: false,
  archiveOtherDraftsOnPromote: false,
  includeTerminal: false,
};

@Entity('scheduling_requirements')
export class SchedulingRequirementEntity {
  @PrimaryGeneratedColumn({
    name: 'scheduling_requirement_id',
    type: 'bigint',
    unsigned: true,
  })
  schedulingRequirementId!: number;

  @Index('idx_sched_req_tenant')
  @Column({ name: 'tenant_id', type: 'bigint', unsigned: true })
  tenantId!: number;

  @Column({
    name: 'requirement_key',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  requirementKey!: string | null;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({
    name: 'scope_type',
    type: 'enum',
    enum: ['project', 'board'],
  })
  scopeType!: SchedulingRequirementScopeType;

  @Column({
    name: 'primary_project_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  primaryProjectId!: number | null;

  @Column({
    name: 'horizon_start_utc',
    type: 'datetime',
    precision: 6,
  })
  horizonStartUtc!: Date;

  @Column({
    name: 'horizon_end_utc',
    type: 'datetime',
    precision: 6,
  })
  horizonEndUtc!: Date;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['open', 'locked', 'closed'],
    default: 'open',
  })
  status!: SchedulingRequirementStatus;

  /** Pointer only — no FK to avoid circular dependency with scenarios. */
  @Column({
    name: 'active_scenario_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  activeScenarioId!: number | null;

  @Column({
    name: 'final_scenario_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  finalScenarioId!: number | null;

  @Column({
    name: 'synced_to_live_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  syncedToLiveAt!: Date | null;

  @Column({
    name: 'synced_scenario_revision',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  syncedScenarioRevision!: number | null;

  @Column({
    name: 'promote_policy',
    type: 'json',
    nullable: false,
  })
  promotePolicy!: SchedulingPromotePolicy;

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
}
