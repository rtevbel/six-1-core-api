import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { TenantTypeEntity } from '../tenant_types/entities/tenant_type.entity';
import { SystemStatusEntity } from '../../settings/system_statuses/entities/system-status.entity';
import { TenantMetaEntity } from '../tenant_meta/entities/tenant_meta.entity';
import { TenantContactInfoEntity } from '../tenant_contact_info/entities/tenant_contact_info.entity';
import { TenantBillingInfoEntity } from '../tenant_billing_info/entities/tenant_billing_info.entity';
import { TenantSubscriptionEntity } from '../tenant_subscriptions/entities/tenant_subscription.entity';
import { TenantConfigurationsEntity } from '../tenant_configurations/entities/tenant_configuration.entity';
import { TenantUsersEntity } from '../tenant_users/entities/tenant_user.entity';
import { TenantUserInvitationsEntity } from '../tenant_users/tenant_user_invitations/entities/tenant_user_invitation.entity';
import { TenantTeamEntity } from '../tenant_teams/entities/tenant_team.entity';
import { TenantOffDaysEntity } from '../tenant_off_days/entities/tenant_off_day.entity';
import { CategoryEntity } from '../../categories/entities/category.entity';
import { ProcessTemplateEntity } from '../../process_templates/entities/process_template.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { ProjectTaskStatusEntity } from '../../projects/project_task_statuses/entities/project_task_status.entity';
import { ProcessInstanceEntity } from '../../process_instances/entities/process_instance.entity';

/**
 * Entity class for `tenants` table.
 *
 * Represents the tenants in the system.
 */
@Entity('tenants')
export class TenantEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantId!: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Example: Company, Freelancer, or Middleman',
  })
  name!: string;

  @Column({
    name: 'tenant_type_id',
    type: 'tinyint',
    unsigned: true,
    nullable: false,
    comment: 'Company, freelancer, middleman etc',
  })
  @Index('tenants_tenant_type_id')
  tenantTypeId!: number;

  @Column({
    name: 'tenant_indentifier',
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: false,
    comment: 'Unique identifier for tenant',
  })
  tenantIdentifier!: string;

  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Owner of this tenant',
  })
  @Index('tenants_user_id')
  userId!: number;

  @Column({
    name: 'status_id',
    type: 'tinyint',
    unsigned: true,
    nullable: false,
    comment: 'Tenant status',
  })
  statusId!: number;

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
   * Relationship to UserEntity.
   * A tenant can have one user record.
   */
  @OneToOne(() => UserEntity, (user) => user.tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  /**
   * Relationship to TenantTypeEntity.
   * A tenant belongs to one tenant type.
   */
  @ManyToOne(() => TenantTypeEntity, (tenantType) => tenantType.tenants)
  @JoinColumn({ name: 'tenant_type_id' })
  tenantType!: TenantTypeEntity;

  /**
   * Relationship to SystemStatusEntity.
   * A tenant can have one status record.
   */
  @OneToOne(() => SystemStatusEntity, (statuses) => statuses.tenant, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'status_id' })
  status!: SystemStatusEntity;

  /**
   * Relationship to TenantMetaEntity.
   * A tenant can have multiple tenant meta records.
   */
  @OneToMany(() => TenantMetaEntity, (tenantMeta) => tenantMeta.tenant, {
    cascade: true,
  })
  tenantMeta!: TenantMetaEntity[];

  /**
   * Relationship to TenantContactInfoEntity.
   * A tenant can have multiple contact info records.
   */
  @OneToMany(
    () => TenantContactInfoEntity,
    (contactInfo) => contactInfo.tenant,
    { cascade: true },
  )
  contactInfo!: TenantContactInfoEntity[];

  /**
   * Relationship to TenantBillingInfoEntity.
   * A tenant can have multiple billing info records.
   */
  @OneToMany(() => TenantBillingInfoEntity, (billingInfo) => billingInfo.tenant)
  billingInfo!: TenantBillingInfoEntity[];

  /**
   * Relationship to TenantSubscriptionEntity.
   * A tenant can have multiple subscriptions.
   */
  @OneToMany(
    () => TenantSubscriptionEntity,
    (subscription) => subscription.tenant,
  )
  subscriptions!: TenantSubscriptionEntity[];

  /**
   * Relationship to TenantConfigurationsEntity.
   * A tenant can have multiple configurations.
   */
  @OneToMany(
    () => TenantConfigurationsEntity,
    (configuration) => configuration.tenant,
  )
  configurations!: TenantConfigurationsEntity[];

  /**
   * Relationship to TenantUsersEntity.
   * A tenant can have multiple tenant users.
   */
  @OneToMany(() => TenantUsersEntity, (tenantUser) => tenantUser.tenant)
  users!: TenantUsersEntity[];

  /**
   * Relationship to TenantUserInvitationsEntity.
   * A tenant can have multiple invitations.
   */
  @OneToMany(
    () => TenantUserInvitationsEntity,
    (invitation) => invitation.tenant,
  )
  invitations!: TenantUserInvitationsEntity[];

  /**
   * Relationship to TenantTeamEntity.
   * A tenant can have multiple teams.
   */
  @OneToMany(() => TenantTeamEntity, (team) => team.tenant)
  teams!: TenantTeamEntity[];

  /**
   * Reverse relationship to TenantOffDaysEntity.
   * A tenant can have multiple off days.
   */
  @OneToMany(() => TenantOffDaysEntity, (offDay) => offDay.tenant)
  offDays!: TenantOffDaysEntity[];

  /**
   * One-to-many relationship with `CategoryEntity`.
   *
   * Represents the categories associated with the tenant.
   */
  @OneToMany(() => CategoryEntity, (category) => category.tenant, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  categories!: CategoryEntity[];

  /**
   * Relationship to ProcessTemplateEntity.
   * A tenant can have multiple process templates.
   */
  @OneToMany(
    () => ProcessTemplateEntity,
    (processTemplate) => processTemplate.tenant,
    {
      cascade: true,
    },
  )
  processTemplates!: ProcessTemplateEntity[];

  /**
   * One-many relationship to ProjectEntity.
   * A tenant can have many projects.
   */
  @OneToMany(() => ProjectEntity, (project) => project.tenant, {
    cascade: true,
  })
  projects!: ProjectEntity[];

  /**
   *One-to-Many Relationship to ProjectTaskStatusEntity.
   * A tenant can have multiple task statuses.
   */
  @OneToMany(() => ProjectTaskStatusEntity, (taskStatus) => taskStatus.tenant)
  projectTaskStatuses!: ProjectTaskStatusEntity[];

  /**
   * Relationship to ProcessInstanceEntity.
   * A tenant can have multiple process instances.
   */
  @OneToMany(
    () => ProcessInstanceEntity,
    (processInstance) => processInstance.tenant,
    {
      cascade: true,
    },
  )
  processInstances!: ProcessInstanceEntity[];
}
