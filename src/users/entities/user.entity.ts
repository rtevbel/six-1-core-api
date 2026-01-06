import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  OneToOne,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { hash_content } from '../../common/functions';
import { UserRoleEntity } from '../user-roles/entities/user-role.entity';
import { UserMetaEntity } from '../user-meta/entities/user-meta.entity';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { TenantWorkingHoursEntity } from '../../tenants/tenant_working_hours/entities/tenant_working_hour.entity';
import { NotificationChannelEntity } from '../../notifications/notification_channels/entities/notification_channel.entity';
import { NotificationTemplateEntity } from '../../notifications/notification_templates/entities/notification_template.entity';
import { EventEntity } from '../../events/entities/event.entity';
import { EventListenerEntity } from '../../events/event_listeners/entities/event_listener.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { NotificationEntity } from '../../notifications/entities/notification.entity';
import { EventLogEntity } from '../../events/event_logs/entities/event_log.entity';

/**
 * Entity class for `users` table.
 *
 * Represents the users in the system.
 */
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
  })
  userId!: number;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: false,
  })
  @Index('users_email')
  email!: string;

  @Column({
    name: 'username',
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: false,
  })
  @Index('users_username')
  username!: string;

  @Column({
    name: 'first_name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  firstName!: string;

  @Column({
    name: 'last_name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  lastName!: string;

  @Column({
    name: 'password',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  password!: string;

  @Column({
    name: 'status',
    type: 'tinyint',
    unsigned: true,
    nullable: false,
    default: 1,
  })
  status!: number;

  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  displayName!: string;

  @Column({
    name: 'dashboard_url',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  dashboardUrl!: string;

  @Column({
    name: 'activation_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  activationKey!: string;

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

  @Column({
    name: 'last_login_at',
    type: 'datetime',
    nullable: true,
  })
  lastLoginAt!: Date;

  /**
   * Relationship to TenantEntity.
   * A user can belong to one tenant.
   */
  @OneToOne(() => TenantEntity, (tenant) => tenant.user, {
    onDelete: 'CASCADE',
  })
  tenant!: TenantEntity;

  /**
   * Relationship to UserRoleEntity.
   * A user can have multiple roles.
   */
  @OneToMany(() => UserRoleEntity, (userRole) => userRole.user, {
    cascade: true,
  })
  userRoles!: UserRoleEntity[];

  /**
   * Relationship to UserRoleEntity.
   * A user can have multiple roles.
   */
  @OneToMany(() => UserRoleEntity, (userRole) => userRole.creator, {
    cascade: true,
  })
  createdUserRoles!: UserRoleEntity[];

  /**
   * Relationship to UserMetaEntity.
   * A user can have multiple metadata records.
   */
  @OneToMany(() => UserMetaEntity, (userMeta) => userMeta.user, {
    cascade: true,
  })
  userMeta!: UserMetaEntity[];

  /**
   * Relationship to TenantUsersEntity.
   * A user can have multiple tenant user records.
   */
  @OneToMany(() => TenantUsersEntity, (tenantUser) => tenantUser.user, {
    cascade: true,
  })
  tenantUsers!: TenantUsersEntity[];

  /**
   * Relationship to TenantWorkingHoursEntity.
   * A user can create multiple tenant working hours.
   */
  @OneToMany(
    () => TenantWorkingHoursEntity,
    (workingHours) => workingHours.createdBy,
  )
  createdTenantWorkingHours!: TenantWorkingHoursEntity[];

  /**
   * Relationship to TenantWorkingHoursEntity.
   * A user can update multiple tenant working hours.
   */
  @OneToMany(
    () => TenantWorkingHoursEntity,
    (workingHours) => workingHours.updatedBy,
  )
  updatedTenantWorkingHours!: TenantWorkingHoursEntity[];

  /**
   * Relationship to NotificationChannelEntity.
   * A user can create multiple notification channels.
   */
  @OneToMany(
    () => NotificationChannelEntity,
    (notificationChannel) => notificationChannel.createdBy,
  )
  createdNotificationChannels!: NotificationChannelEntity[];

  /**
   * Relationship to NotificationChannelEntity.
   * A user can update multiple notification channels.
   */
  @OneToMany(
    () => NotificationChannelEntity,
    (notificationChannel) => notificationChannel.updatedBy,
  )
  updatedNotificationChannels!: NotificationChannelEntity[];

  /**
   * Relationship to NotificationTemplateEntity.
   * A user can create multiple notification templates.
   */
  @OneToMany(
    () => NotificationTemplateEntity,
    (notificationTemplate) => notificationTemplate.createdBy,
  )
  createdNotificationTemplates!: NotificationTemplateEntity[];

  /**
   * Relationship to NotificationTemplateEntity.
   * A user can updated multiple notification templates.
   */
  @OneToMany(
    () => NotificationTemplateEntity,
    (notificationTemplate) => notificationTemplate.updatedBy,
  )
  updatedNotificationTemplates!: NotificationTemplateEntity[];

  /**
   * Relationship to EventEntity.
   * A user can create multiple events.
   */
  @OneToMany(() => EventEntity, (event) => event.createdBy)
  createdEvents!: EventEntity[];

  /**
   * Relationship to EventEntity.
   * A user can update multiple events.
   */
  @OneToMany(() => EventEntity, (event) => event.updatedBy)
  updatedEvents!: EventEntity[];

  /**
   * Relationship to EventListenerEntity.
   * A user can create multiple event listeners.
   */
  @OneToMany(
    () => EventListenerEntity,
    (eventListener) => eventListener.createdBy,
  )
  createdEventListeners!: EventListenerEntity[];

  /**
   * Relationship to EventListenerEntity.
   * A user can update multiple event listeners.
   */
  @OneToMany(
    () => EventListenerEntity,
    (eventListener) => eventListener.updatedBy,
  )
  updatedEventListeners!: EventListenerEntity[];

  /**
   * Relationship to NotificationEntity.
   * A user can have multiple notifications.
   */
  @OneToMany(() => NotificationEntity, (notification) => notification.user)
  notifications!: NotificationEntity[];

  /**
   * Relationship to EventLogEntity.
   * A user can have multiple event logs linked to them.
   */
  @OneToMany(() => EventLogEntity, (eventLog) => eventLog.user)
  eventLogs!: EventLogEntity[];

  /**
   * Relationship to EventLogEntity.
   * A user can have multiple event logs they created.
   */
  @OneToMany(() => EventLogEntity, (eventLog) => eventLog.creator)
  createdEventLogs!: EventLogEntity[];

  /**
   * Hash the password before inserting or updating the user record.
   */
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.password) {
      this.password = await hash_content(this.password);
    }
  }
}
