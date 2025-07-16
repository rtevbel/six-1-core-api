// src/entities/user-notification-preference.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
//import { TenantUser } from '../tenant-users/tenant-user.entity';
//import { NotificationChannel } from '../notification-channels/notification-channel.entity';

/**
 * Entity representing user notification preferences.
 * This entity maps to the 'user_notification_preferences' table in the database.
 */
@Entity({ name: 'user_notification_preferences' })
export class UserNotificationPreferenceEntity {
  /**
   * Primary key for the notification preference.
   * Auto-generated and unsigned bigint.
   */
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
    name: 'preference_id',
  })
  preferenceId!: string;

  /**
   * Foreign key referencing the user associated with the preference.
   * Unsigned bigint.
   */
  @Column({ type: 'bigint', unsigned: true, name: 'user_id' })
  userId!: number;

  /**
   * Foreign key referencing the notification channel associated with the preference.
   * Unsigned bigint.
   */
  @Column({ type: 'bigint', unsigned: true, name: 'channel_id' })
  channelId!: number;

  /**
   * Indicates whether the notification preference is enabled.
   * Tinyint with a width of 1, default value is 1 (enabled).
   */
  @Column({ type: 'tinyint', width: 1, default: 1, name: 'is_enabled' })
  isEnabled!: boolean;

  /**
   * Timestamp indicating when the preference was created.
   * Automatically managed by TypeORM.
   */
  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  /**
   * Timestamp indicating when the preference was last updated.
   * Automatically managed by TypeORM.
   */
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;

  /**
   * Many-to-one relationship with the TenantUser entity.
   * Represents the user associated with the notification preference.
   * Cascade delete is enabled.
   */
  /*@ManyToOne(() => TenantUser, (user) => user.notificationPreferences, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: TenantUser;*/

  /**
   * Many-to-one relationship with the NotificationChannel entity.
   * Represents the notification channel associated with the preference.
   * Cascade delete is enabled.
   */
  /*@ManyToOne(() => NotificationChannel, (channel) => channel.userPreferences, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'channel_id' })
    channel: NotificationChannel;*/
}
