import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TenantEntity } from '../../entities/tenant.entity';
import { UserEntity } from '../../../users/entities/user.entity';
import { SystemStatusEntity } from '../../../settings/system_statuses/entities/system-status.entity';
import { TenantUserInvitationsEntity } from '../tenant_user_invitations/entities/tenant_user_invitation.entity';
import { TenantUserConfigurationsEntity } from '../tenant_user_configurations/entities/tenant_user_configuration.entity';
import { TenantUserWorkingHoursEntity } from '../tenant_user_working_hours/entities/tenant_user_working_hour.entity';
import { TenantUserOffDaysEntity } from '../tenant_user_off_days/entities/tenant_user_off_day.entity';
import { TenantUserMetaEntity } from '../tenant_user_meta/entities/tenant_user_meta.entity';

/**
 * Entity class for `tenant_users` table.
 *
 * Represents the users associated with tenants.
 */
@Entity('tenant_users')
export class TenantUsersEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_user_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantUserId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant',
  })
  @Index('tenant_users_tenant_id')
  tenantId!: number;

  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked user',
  })
  @Index('tenant_users_user_id')
  userId!: number;

  @Column({
    name: 'status_id',
    type: 'tinyint',
    unsigned: true,
    nullable: false,
    default: 1,
    comment: 'Status of the tenant user',
  })
  @Index('tenant_users_status_id')
  statusId!: number;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'User who created this record',
  })
  @Index('tenant_users_created_by')
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: 'User who last updated this record',
  })
  @Index('tenant_users_updated_by')
  updatedBy!: number;

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
   * Relationship to TenantEntity.
   * A tenant user belongs to one tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  /**
   * Relationship to UserEntity.
   * A tenant user is linked to one user.
   */
  @ManyToOne(() => UserEntity, (user) => user.tenantUsers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  /**
   * Relationship to SystemStatusEntity.
   * A tenant user has one status.
   */
  @ManyToOne(() => SystemStatusEntity, (status) => status.tenantUsers)
  @JoinColumn({ name: 'status_id' })
  status!: SystemStatusEntity;

  /**
   * Relationship to TenantUsersEntity for createdBy.
   * A tenant user is created by another tenant user.
   */
  @ManyToOne(
    () => TenantUsersEntity,
    (tenantUser) => tenantUser.createdByUsers,
    { nullable: true },
  )
  @JoinColumn({ name: 'created_by' })
  createdByUser?: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for createdBy.
   * A tenant user is created by another tenant user.
   */
  @OneToMany(() => TenantUsersEntity, (tenantUser) => tenantUser.createdByUser)
  createdByUsers!: TenantUsersEntity[];

  /**
   * Relationship to TenantUsersEntity for updatedBy.
   * A tenant user is updated by another tenant user.
   */
  @ManyToOne(
    () => TenantUsersEntity,
    (tenantUser) => tenantUser.updatedByUsers,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'updated_by' })
  updatedByUser?: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for updatedBy.
   * A tenant user is updated by another tenant user.
   */
  @OneToMany(() => TenantUsersEntity, (tenantUser) => tenantUser.updatedByUser)
  updatedByUsers!: TenantUsersEntity[];

  /**
   * Relationship to TenantUserInvitationsEntity.
   * A tenant user can send multiple invitations.
   */
  @OneToMany(
    () => TenantUserInvitationsEntity,
    (invitation) => invitation.invitedByUser,
  )
  sentInvitations!: TenantUserInvitationsEntity[];

  /**
   * Inverse relationship to TenantUserConfigurationsEntity.
   * A tenant user can have multiple configurations.
   */
  @OneToMany(
    () => TenantUserConfigurationsEntity,
    (configuration) => configuration.tenantUser,
  )
  configurations!: TenantUserConfigurationsEntity[];

  /**
   * Inverse relationship to TenantUserConfigurationsEntity for createdBy.
   * A tenant user can create multiple configurations.
   */
  @OneToMany(
    () => TenantUserConfigurationsEntity,
    (configuration) => configuration.createdByUser,
  )
  createdConfigurations!: TenantUserConfigurationsEntity[];

  /**
   * Inverse relationship to TenantUserConfigurationsEntity for updatedBy.
   * A tenant user can update multiple configurations.
   */
  @OneToMany(
    () => TenantUserConfigurationsEntity,
    (configuration) => configuration.updatedByUser,
  )
  updatedConfigurations!: TenantUserConfigurationsEntity[];

  /**
   * Inverse relationship to TenantUserWorkingHoursEntity.
   * A tenant user can have multiple working hours.
   */
  @OneToMany(
    () => TenantUserWorkingHoursEntity,
    (workingHour) => workingHour.tenantUser,
  )
  workingHours!: TenantUserWorkingHoursEntity[];

  /**
   * Inverse relationship to TenantUserWorkingHoursEntity for createdBy.
   * A tenant user can create multiple working hours.
   */
  @OneToMany(
    () => TenantUserWorkingHoursEntity,
    (workingHour) => workingHour.createdByUser,
  )
  createdWorkingHours!: TenantUserWorkingHoursEntity[];

  /**
   * Inverse relationship to TenantUserWorkingHoursEntity for updatedBy.
   * A tenant user can update multiple working hours.
   */
  @OneToMany(
    () => TenantUserWorkingHoursEntity,
    (workingHour) => workingHour.updatedByUser,
  )
  updatedWorkingHours!: TenantUserWorkingHoursEntity[];

  /**
   *Relationship to TenantUserOffDaysEntity.
   * A tenant user can have multiple off days.
   */
  @OneToMany(() => TenantUserOffDaysEntity, (offDay) => offDay.tenantUser, {
    cascade: true,
  })
  offDays!: TenantUserOffDaysEntity[];

  /**
   * Relationship to TenantUserOffDaysEntity for createdBy.
   * A tenant user can create multiple off days.
   */
  @OneToMany(() => TenantUserOffDaysEntity, (offDay) => offDay.createdByUser, {
    cascade: true,
  })
  createdOffDays!: TenantUserOffDaysEntity[];

  /**
   * Relationship to TenantUserOffDaysEntity for updatedBy.
   * A tenant user can update multiple off days.
   */
  @OneToMany(() => TenantUserOffDaysEntity, (offDay) => offDay.updatedByUser, {
    cascade: true,
  })
  updatedOffDays!: TenantUserOffDaysEntity[];

  /**
   * Relationship to TenantUserMetaEntity.
   * A tenant user can have multiple metadata entries.
   */
  @OneToMany(
    () => TenantUserMetaEntity,
    (tenantUserMeta) => tenantUserMeta.tenantUser,
  )
  meta!: TenantUserMetaEntity[];
}
