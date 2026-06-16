import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { EventEntity } from '../../events/entities/event.entity';
import { NotificationLogEntity } from '../notification_logs/entities/notification_log.entity';

/**
 * Entity class for `notifications` table.
 *
 * Represents the notifications in the system.
 */
@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn({
    name: 'notification_id',
    type: 'bigint',
    unsigned: true,
  })
  notificationId!: number;

  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'User who should receive the notification',
  })
  userId!: number;

  @Column({
    name: 'event_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Linked event',
  })
  eventId!: number | null;

  @Column({
    name: 'type',
    type: 'enum',
    enum: ['push', 'sms', 'email', 'system'],
    nullable: false,
    comment: 'Type of notification',
  })
  type!: 'push' | 'sms' | 'email' | 'system';

  @Column({
    name: 'subject',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Subject of the notification (e.g., email subject)',
  })
  subject!: string | null;

  @Column({
    name: 'message',
    type: 'text',
    nullable: false,
    comment: 'Content of the notification',
  })
  message!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
    comment: 'Status of the notification',
  })
  status!: 'pending' | 'sent' | 'failed';

  @Column({
    name: 'send_attempts',
    type: 'int',
    unsigned: true,
    default: 0,
    comment: 'Outbound send attempts (P8)',
  })
  sendAttempts!: number;

  @Column({
    name: 'next_retry_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
    comment: 'Earliest retry time after failed send (P8)',
  })
  nextRetryAt!: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @Column({
    name: 'scheduled_at',
    type: 'datetime',
    nullable: true,
    comment: 'When the notification should be sent',
  })
  scheduledAt!: Date | null;

  @Column({
    name: 'sent_at',
    type: 'datetime',
    nullable: true,
    comment: 'When the notification was sent',
  })
  sentAt!: Date | null;

  /**
   * Relationship to UserEntity.
   * A notification belongs to one user.
   */
  @ManyToOne(() => UserEntity, (user) => user.notifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  /**
   * Relationship to EventEntity.
   * A notification can be linked to one event.
   */
  @ManyToOne(() => EventEntity, (event) => event.notifications, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'event_id' })
  event!: EventEntity | null;

  /**
   * Relationship to NotificationLogEntity.
   * A notification can have multiple logs.
   */
  @OneToMany(() => NotificationLogEntity, (log) => log.notification, {
    cascade: true,
  })
  logs!: NotificationLogEntity[];
}
