import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  Check,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { ProjectTaskStatusEntity } from '../../projects/project_task_statuses/entities/project_task_status.entity';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';
import { ScheduledTaskHistoryEntity } from './scheduled_task_history.entity';
import { ScheduledTaskEventsEntity } from './scheduled_task_event.entity';
import { ResourceAssignmentShiftEntity } from './resource_assignment_shifts.entity';
import { BlockReason, ScheduledTaskStatus } from '../constants';

@Check('chk_requested_window', '`requested_end_utc` >= `requested_start_utc`')
@Check('chk_effective_window', '`effective_end_utc` >= `effective_start_utc`')
@Index('idx_user', ['tenantUserId'])
@Index('idx_user_active_window', [
  'tenantUserId',
  'isActive',
  'effectiveStartUtc',
  'effectiveEndUtc',
])
@Entity('scheduled_tasks')
export class ScheduledTaskEntity {
  @PrimaryGeneratedColumn({
    name: 'scheduled_task_id',
    type: 'bigint',
    unsigned: true,
  })
  scheduledTaskId!: number;

  @Index('idx_parent_scheduled_task_id')
  @Column({
    name: 'parent_scheduled_task_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  parentScheduledTaskId!: number | null;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Denormalized for fast tenant scoping',
  })
  @Index('idx_tenant_status') // part 1 of composite index
  tenantId!: number;

  @Column({
    name: 'tenant_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Primary calendar subject (e.g., assignee)',
  })
  tenantUserId?: number | null;

  @Column({
    name: 'task_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked task',
  })
  @Index('idx_task')
  taskId!: number;

  @Column({
    name: 'process_instance_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Dynamic process instance for this schedule',
  })
  @Index('idx_scheduled_tasks_process_instance')
  processInstanceId!: number | null;

  @Column({
    name: 'task_status_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Current task status snapshot',
  })
  taskStatusId!: number;

  @Column({
    name: 'requested_start_utc',
    type: 'datetime',
    precision: 6,
    nullable: false,
    comment: 'What caller asked for',
  })
  requestedStartUtc!: Date;

  @Column({
    name: 'requested_end_utc',
    type: 'datetime',
    precision: 6,
    nullable: false,
  })
  requestedEndUtc!: Date;

  @Column({
    name: 'effective_start_utc',
    type: 'datetime',
    precision: 6,
    nullable: false,
    comment: 'After deps + calendar',
  })
  @Index('idx_effective_start') // part 1 of composite index
  effectiveStartUtc!: Date;

  @Column({
    name: 'effective_end_utc',
    type: 'datetime',
    precision: 6,
    nullable: false,
  })
  @Index('idx_effective_end') // part 1 of composite index
  effectiveEndUtc!: Date;

  @Column({
    name: 'actual_start_utc',
    type: 'datetime',
    precision: 6,
    nullable: true,
    comment: 'When we actually started',
  })
  actualStartUtc?: Date | null;

  @Column({
    name: 'actual_end_utc',
    type: 'datetime',
    precision: 6,
    nullable: true,
    comment: 'When we actually ended',
  })
  actualEndUtc?: Date | null;

  @Column({
    name: 'tz_used',
    type: 'varchar',
    length: 50,
    nullable: false,
    default: () => `'UTC'`,
    comment: 'Timezone applied during calc',
  })
  tzUsed!: string;

  @Column({
    name: 'dependency_gate_utc',
    type: 'datetime',
    precision: 6,
    nullable: true,
    comment: 'Max constraint from predecessors',
  })
  dependencyGateUtc?: Date | null;

  @Column({
    name: 'blocked_until_utc',
    type: 'datetime',
    precision: 6,
    nullable: true,
    comment: 'If closed now, next known opening',
  })
  @Index('idx_blocked_until')
  blockedUntilUtc?: Date | null;

  @Column({
    name: 'block_reason',
    type: 'enum',
    enum: ['none', 'calendar', 'dependency'],
    default: 'none',
  })
  blockReason!: BlockReason;

  @Column({
    name: 'start_job_token',
    type: 'char',
    length: 36,
    nullable: true,
    comment: 'Idempotency token (UUID) for start job',
  })
  @Index('idx_start_job_token')
  startJobToken?: string | null;

  @Column({
    name: 'end_job_token',
    type: 'char',
    length: 36,
    nullable: true,
    comment: 'Idempotency token (UUID) for end job',
  })
  @Index('idx_end_job_token')
  endJobToken?: string | null;

  @Column({
    name: 'start_job_id',
    type: 'varchar',
    length: 128,
    nullable: true,
    comment: 'External queue job id',
  })
  startJobId?: string | null;

  @Column({
    name: 'end_job_id',
    type: 'varchar',
    length: 128,
    nullable: true,
    comment: 'External queue job id',
  })
  endJobId?: string | null;

  @Column({
    name: 'start_attempts',
    type: 'smallint',
    unsigned: true,
    default: () => '0',
  })
  startAttempts!: number;

  @Column({
    name: 'end_attempts',
    type: 'smallint',
    unsigned: true,
    default: () => '0',
  })
  endAttempts!: number;

  @Column({
    name: 'last_error',
    type: 'text',
    nullable: true,
  })
  lastError?: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: [
      'scheduled',
      'queued',
      'running',
      'completed',
      'failed',
      'cancelled',
      'paused',
      'expired',
    ],
    default: 'scheduled',
  })
  @Index('idx_tenant_status', ['tenantId', 'status'])
  @Index('idx_effective_start', ['effectiveStartUtc', 'status'])
  @Index('idx_effective_end', ['effectiveEndUtc', 'status'])
  status!: ScheduledTaskStatus;

  @Column({
    name: 'priority',
    type: 'tinyint',
    unsigned: true,
    default: () => '0',
    comment: '0=normal, higher=sooner',
  })
  priority!: number;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    unsigned: true,
    default: () => '1',
    comment: 'Only one active row per task',
  })
  isActive!: number; // 0/1

  @Column({
    name: 'version',
    type: 'int',
    unsigned: true,
    default: () => '1',
    comment: 'Bumps on recalculation',
  })
  version!: number;

  @Column({
    name: 'calendar_snapshot',
    type: 'json',
    nullable: true,
    comment: 'Intervals & off-days used at calc time',
  })
  calendarSnapshot?: Record<string, unknown> | null;

  @Column({
    name: 'dependency_snapshot',
    type: 'json',
    nullable: true,
    comment: 'Deps used to compute gates',
  })
  dependencySnapshot?: Record<string, unknown> | null;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  createdBy?: number | null;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  updatedBy?: number | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  deletedAt?: Date | null;

  @Column({
    name: 'active_guard',
    type: 'bigint',
    asExpression:
      'CAST(IF(`is_active` = 1 AND `parent_scheduled_task_id` IS NULL, `task_id`, NULL) AS UNSIGNED)',
    generatedType: 'VIRTUAL',
    nullable: true,
  })
  @Index('uq_active_per_task', { unique: true })
  activeGuard?: number | null;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @ManyToOne(() => TenantUsersEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tenant_user_id' })
  tenantUser?: TenantUsersEntity | null;

  @ManyToOne(() => TaskEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: TaskEntity;

  @ManyToOne(() => ProjectTaskStatusEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'task_status_id' })
  taskStatus!: ProjectTaskStatusEntity;

  /**
   * Relationship to ScheduledTaskHistoryEntity.
   * A scheduled task can have multiple history records.
   */
  @OneToMany(
    () => ScheduledTaskHistoryEntity,
    (history) => history.scheduledTask,
    {
      cascade: true,
    },
  )
  history!: ScheduledTaskHistoryEntity[];

  /**
   * Relationship to ScheduledTaskEventsEntity.
   * A scheduled task can have multiple events.
   */
  @OneToMany(() => ScheduledTaskEventsEntity, (event) => event.scheduledTask, {
    cascade: true,
  })
  events!: ScheduledTaskEventsEntity[];

  /**
   * Inverse relationship to ResourceAssignmentShiftEntity.
   * Represents all shifts associated with this scheduled task.
   */
  @OneToMany(
    () => ResourceAssignmentShiftEntity,
    (shift) => shift.scheduledTask,
    {
      cascade: true,
    },
  )
  resourceAssignmentShifts!: ResourceAssignmentShiftEntity[];

  public getId() {
    return this.scheduledTaskId;
  }
}
