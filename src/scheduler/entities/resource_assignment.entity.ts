import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ResourceEntity } from './resource.entity';
import { ScheduledTaskEntity } from './scheduled_task.entity';
import { ResourceAssignmentShiftEntity } from './resource_assignment_shifts.entity';

/**
 * Entity class for `resource_assignments` table.
 *
 * Links resources to scheduled tasks with specific time allocations.
 */
@Entity('resource_assignments')
export class ResourceAssignmentEntity {
  @PrimaryGeneratedColumn({
    name: 'resource_assignment_id',
    type: 'bigint',
    unsigned: true,
  })
  resourceAssignmentId!: number;

  @Column({
    name: 'resource_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked resource (human/equipment)',
  })
  @Index('resource_assignments_resource_id')
  resourceId!: number;

  @Column({
    name: 'scheduled_task_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Linked scheduled task',
  })
  @Index('resource_assignments_scheduled_task_id')
  scheduledTaskId?: number;

  @Column({
    name: 'assigned_start',
    type: 'datetime',
    nullable: false,
    comment: 'Resource-specific start time',
  })
  assignedStart!: Date;

  @Column({
    name: 'assigned_end',
    type: 'datetime',
    nullable: false,
    comment: 'Resource-specific end time',
  })
  assignedEnd!: Date;

  /**
   * Relationship to ResourceEntity.
   */
  @ManyToOne(() => ResourceEntity, (resource) => resource.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource!: ResourceEntity;

  /**
   * Relationship to ScheduledTaskEntity.
   */
  @ManyToOne(() => ScheduledTaskEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheduled_task_id' })
  scheduledTask?: ScheduledTaskEntity;

  /**
   * Inverse relationship to ResourceAssignmentShiftEntity.
   */
  @OneToMany(
    () => ResourceAssignmentShiftEntity,
    (shift) => shift.resourceAssignment,
  )
  shifts!: ResourceAssignmentShiftEntity[];
}
