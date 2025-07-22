import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantUsersEntity } from '../../entities/tenant_user.entity';
import { SystemLanguageEntity } from '../../../../settings/system_languages/entities/system-language.entity';

/**
 * Entity class for `tenant_user_configurations` table.
 *
 * Represents the configurations for tenant users.
 */
@Entity('tenant_user_configurations')
export class TenantUserConfigurationsEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_user_config_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantUserConfigId!: number;

  @Column({
    name: 'tenant_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant user',
  })
  tenantUserId!: number;

  @Column({
    name: 'timezone',
    type: 'varchar',
    length: 50,
    default: 'UTC',
    comment: 'Timezone',
  })
  timezone!: string;

  @Column({
    name: 'language_id',
    type: 'tinyint',
    unsigned: true,
    default: 1,
  })
  languageId!: number;

  @Column({
    name: 'default_currency',
    type: 'varchar',
    length: 10,
    default: 'USD',
    comment: 'Default currency',
  })
  defaultCurrency!: string;

  @Column({
    name: 'week_start_day',
    type: 'varchar',
    length: 10,
    default: 'Monday',
    comment: 'Week start day e.g Monday or Sunday',
  })
  weekStartDay!: string;

  @Column({
    name: 'date_format',
    type: 'varchar',
    length: 20,
    default: 'YYYY-MM-DD',
    comment: 'Date format',
  })
  dateFormat!: string;

  @Column({
    name: 'time_format',
    type: 'varchar',
    length: 20,
    default: '24h',
    comment: 'Time format (12h,24h)',
  })
  timeFormat!: string;

  @Column({
    name: 'notification_preferences',
    type: 'varchar',
    length: 255,
    default: 'email',
    comment: 'e.g. email, sms, push',
  })
  notificationPreferences!: string;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'User who created the configuration',
  })
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: 'User who last updated the configuration',
  })
  updatedBy!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
    comment: 'When the configuration was created',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
    comment: 'When the configuration was last updated',
  })
  updatedAt!: Date;

  /**
   * Relationship to TenantUsersEntity.
   * A configuration belongs to one tenant user.
   */
  @ManyToOne(
    () => TenantUsersEntity,
    (tenantUser) => tenantUser.configurations,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'tenant_user_id' })
  tenantUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for createdBy.
   * The configuration is created by one tenant user.
   */
  @ManyToOne(
    () => TenantUsersEntity,
    (tenantUser) => tenantUser.createdConfigurations,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for updatedBy.
   * The configuration is updated by one tenant user.
   */
  @ManyToOne(
    () => TenantUsersEntity,
    (tenantUser) => tenantUser.updatedConfigurations,
    {
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: TenantUsersEntity;

  /**
   * Relation to the SystemLanguageEntity.
   * Establishes a many-to-one relationship with the system_languages table.
   */
  @ManyToOne(
    () => SystemLanguageEntity,
    (language) => language.tenantUserConfigurations,
  )
  @JoinColumn({ name: 'language_id' })
  language!: SystemLanguageEntity;
}
