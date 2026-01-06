import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantEntity } from '../../entities/tenant.entity';

/**
 * Entity class for `tenant_configurations` table.
 *
 * Represents the configuration settings for tenants.
 */
@Entity('tenant_configurations')
export class TenantConfigurationsEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_config_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantConfigId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant',
  })
  @Index('tenant_configurations_tenant_id')
  tenantId!: number;

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
    nullable: false,
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
    name: 'default_task_status',
    type: 'varchar',
    length: 50,
    default: 'To Do',
    comment: 'Default task status',
  })
  defaultTaskStatus!: string;

  @Column({
    name: 'notification_preferences',
    type: 'varchar',
    length: 255,
    default: 'email',
    comment: 'e.g. email, sms, push',
  })
  notificationPreferences!: string;

  @Column({
    name: 'branding_logo',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'URL to branding logo',
  })
  brandingLogo!: string;

  @Column({
    name: 'two_factor_auth_enabled',
    type: 'tinyint',
    unsigned: true,
    default: 0,
    comment: 'Is 2FA enabled?',
  })
  twoFactorAuthEnabled!: boolean;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  @Index('tenant_configurations_created_by')
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    default: 0,
  })
  @Index('tenant_configurations_updated_by')
  updatedBy!: number;

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
   * Relationship to TenantEntity.
   * A tenant configuration belongs to one tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.configurations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;
}
