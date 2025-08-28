import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { EventListenerEntity } from '../event_listeners/entities/event_listener.entity';
import { NotificationEntity } from '../../notifications/entities/notification.entity';
import { EventLogEntity } from '../event_logs/entities/event_log.entity';

/**
 * Entity class for `events` table.
 *
 * Represents the events in the system.
 */
@Entity('events')
export class EventEntity {
  @PrimaryGeneratedColumn({
    name: 'event_id',
    type: 'bigint',
    unsigned: true,
  })
  eventId!: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Name of the event (e.g., task_assigned, comment_added)',
    unique: true,
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
    comment: 'Description of the event',
  })
  description?: string;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'WP User who created the event',
  })
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    default: 0,
    comment: 'WP User who updated the event',
  })
  updatedBy?: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;

  /**
   * Relationship to UserEntity for created_by.
   */
  @ManyToOne(() => UserEntity, (user) => user.createdEvents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;

  /**
   * Relationship to UserEntity for updated_by.
   */
  @ManyToOne(() => UserEntity, (user) => user.updatedEvents, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;

  /**
   * Relationship to EventListenerEntity for event_id.
   */
  @OneToMany(() => EventListenerEntity, (eventListener) => eventListener.event)
  eventListeners!: EventListenerEntity[];

  /**
   * Relationship to NotificationEntity.
   * An event can have multiple notifications linked to it.
   */
  @OneToMany(() => NotificationEntity, (notification) => notification.event)
  notifications!: NotificationEntity[];

  /**
   * Relationship to EventLogEntity.
   * An event can have multiple event logs linked to it.
   */
  @OneToMany(() => EventLogEntity, (eventLog) => eventLog.event)
  eventLogs!: EventLogEntity[];
}
