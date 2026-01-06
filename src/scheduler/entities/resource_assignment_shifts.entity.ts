import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { ScheduledTaskEntity } from './scheduled_task.entity';
import { ResourceAssignmentEntity } from './resource_assignment.entity';

/**
 * Entity class for `resource_assignment_shifts` table.
 *
 * Represents the shifts assigned to resources.
 *
 * Note: The unique constraint on (scheduled_task_id, sequence_no) allows
 * the same resource to be scheduled multiple times across different tasks,
 * while ensuring sequence numbers are unique within each scheduled task.
 */
@Index('uq_scheduled_task_sequence', ['scheduledTaskId', 'sequenceNo'], {
  unique: true,
})
@Entity('resource_assignment_shifts')
export class ResourceAssignmentShiftEntity {
  @PrimaryGeneratedColumn({ name: 'shift_id', type: 'bigint', unsigned: true })
  shiftId!: number;

  @Index()
  @Column({ name: 'resource_assignment_id', type: 'bigint', unsigned: true })
  resourceAssignmentId!: number;

  @Index('idx_shift_tenant_user')
  @Column({ name: 'tenant_user_id', type: 'bigint', unsigned: true })
  tenantUserId!: number;

  @Column({ name: 'sequence_no', type: 'int', unsigned: true, default: 1 })
  sequenceNo!: number;

  @Column({ name: 'planned_start_utc', type: 'datetime', precision: 6 })
  plannedStartUtc!: Date;

  @Column({ name: 'planned_end_utc', type: 'datetime', precision: 6 })
  plannedEndUtc!: Date;

  @Index('idx_shift_sched')
  @Column({
    name: 'scheduled_task_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  scheduledTaskId!: number | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['planned', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'planned',
  })
  status!: 'planned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

  @Column({
    name: 'locked_until_utc',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  lockedUntilUtc!: Date | null;

  @Column({
    name: 'locked_by_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  lockedByUserId!: number | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
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

  /**
   * Relationship to ScheduledTaskEntity (nullable until a schedule is created).
   */
  @ManyToOne(
    () => ScheduledTaskEntity,
    (task) => task.resourceAssignmentShifts,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'scheduled_task_id' })
  scheduledTask!: ScheduledTaskEntity | null;

  /**
   * Relationship to TenantUsersEntity (assignee for the shift).
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.resourceAssignmentShifts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_user_id' })
  tenantUser!: TenantUsersEntity;

  /**
   * Relationship to ResourceAssignmentEntity.
   */
  @ManyToOne(
    () => ResourceAssignmentEntity,
    (assignment) => assignment.shifts,
    {
      nullable: true,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'resource_assignment_id' })
  resourceAssignment?: ResourceAssignmentEntity;
}
