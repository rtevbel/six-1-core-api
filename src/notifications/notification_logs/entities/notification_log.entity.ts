import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationEntity } from '../../entities/notification.entity';
import { NotificationChannelEntity } from '../../notification_channels/entities/notification_channel.entity';

/**
 * Entity class for `notification_logs` table.
 *
 * Represents the logs of notification attempts in the system.
 */
@Entity('notification_logs')
export class NotificationLogEntity {
  @PrimaryGeneratedColumn({
    name: 'log_id',
    type: 'bigint',
    unsigned: true,
  })
  logId!: number;

  @Column({
    name: 'notification_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked notification',
  })
  notificationId!: number;

  @Column({
    name: 'channel_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Channel used for the notification',
  })
  channelId!: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['pending', 'sent', 'failed'],
    nullable: false,
    comment: 'Status of the notification attempt',
  })
  status!: 'pending' | 'sent' | 'failed';

  @Column({
    name: 'response',
    type: 'text',
    nullable: true,
    comment: 'Response from the notification service (e.g., error message)',
  })
  response!: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  /**
   * Relationship to NotificationEntity.
   * A log belongs to one notification.
   */
  @ManyToOne(() => NotificationEntity, (notification) => notification.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'notification_id' })
  notification!: NotificationEntity;

  /**
   * Relationship to NotificationChannelEntity.
   * A log belongs to one notification channel.
   */
  @ManyToOne(() => NotificationChannelEntity, (channel) => channel.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'channel_id' })
  channel!: NotificationChannelEntity;
}
