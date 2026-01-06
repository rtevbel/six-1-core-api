import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../../users/entities/user.entity';
import { EventEntity } from '../../entities/event.entity';

/**
 * Entity class for `event_logs` table.
 *
 * Represents the logs of events in the system.
 */
@Entity('event_logs')
export class EventLogEntity {
  @PrimaryGeneratedColumn({
    name: 'log_id',
    type: 'bigint',
    unsigned: true,
  })
  logId!: number;

  @Column({
    name: 'event_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked event',
  })
  eventId!: number;

  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'User who triggered the event',
  })
  userId!: number;

  @Column({
    name: 'entity_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment:
      'ID of the entity related to the event (e.g., task_id, comment_id)',
  })
  entityId?: number;

  @Column({
    name: 'entity_type',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Type of the entity (e.g., task, comment)',
  })
  entityType?: string;

  @Column({
    name: 'external_id',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'ID returned by the external notification service',
  })
  externalId?: string;

  @Column({
    name: 'status',
    type: 'tinyint',
    unsigned: true,
    nullable: true,
    comment: 'Status of the event log (0 = active, 1 = processed)',
  })
  status?: number;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'WP User who created the comment',
  })
  createdBy!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  /**
   * Relationship to EventEntity for event_id.
   */
  @ManyToOne(() => EventEntity, (event) => event.eventListeners, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'event_id' })
  event!: EventEntity;

  /**
   * Relationship to UserEntity for user_id.
   */
  @ManyToOne(() => UserEntity, (user) => user.eventLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  /**
   * Relationship to UserEntity for created_by.
   */
  @ManyToOne(() => UserEntity, (user) => user.createdEventLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;
}
