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
import { TenantUserRoleEntity } from '../tenant_user_roles/entities/tenant_user_role.entity';
import { TenantTeamEntity } from '../../tenant_teams/entities/tenant_team.entity';
import { TenantTeamMemberEntity } from '../../tenant_teams/tenant_team_members/entities/tenant_team_member.entity';
import { CategoryEntity } from '../../../categories/entities/category.entity';
import { ProcessTemplateEntity } from '../../../process_templates/entities/process_template.entity';
import { ProcessTemplateStepEntity } from '../../../process_templates/process_template_steps/entities/process_template_step.entity';
import { ProcessTemplateStepRequirementEntity } from '../../../process_templates/process_template_steps/process_template_step_requirements/entities/process_template_step_requirement.entity';
import { ProcessTemplateStepRequirementSubmissionEntity } from '../../../process_templates/process_template_steps/process_template_step_requirement_submissions/entities/process_template_step_requirement_submission.entity';
import { ProcessTemplateStepTriggerConditionEntity } from '../../../process_templates/process_template_steps/process_template_step_trigger_conditions/entities/process_template_step_trigger_condition.entity';
import { ProjectEntity } from '../../../projects/entities/project.entity';
import { ProjectTaskStatusEntity } from '../../../projects/project_task_statuses/entities/project_task_status.entity';
import { TaskEntity } from '../../../projects/tasks/entities/task.entity';
import { TenantTeamProjectEntity } from '../../tenant_teams/tenant_team_projects/entities/tenant_team_project.entity';
import {ProcessInstanceEntity} from "../../../process_instances/entities/process_instance.entity";

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

  /**
   * Relationship to TenantUserRoleEntity.
   * A tenant user can have multiple roles assigned.
   */
  @OneToMany(
    () => TenantUserRoleEntity,
    (tenantUserRole) => tenantUserRole.tenantUser,
  )
  roles!: TenantUserRoleEntity[];

  /**
   * Relationship to TenantUserRoleEntity.
   * A tenant user can assign roles to other users.
   */
  @OneToMany(
    () => TenantUserRoleEntity,
    (tenantUserRole) => tenantUserRole.createdByUser,
  )
  assignedRoles!: TenantUserRoleEntity[];

  /**
   * Inverse relationship to TenantTeamEntity.
   * A tenant user can create multiple teams.
   */
  @OneToMany(() => TenantTeamEntity, (team) => team.createdByUser)
  createdTeams!: TenantTeamEntity[];

  /**
   * Inverse relationship to TenantTeamEntity.
   * A tenant user can update multiple teams.
   */
  @OneToMany(() => TenantTeamEntity, (team) => team.updatedByUser)
  updatedTeams!: TenantTeamEntity[];

  /**
   * Relationship to TenantTeamMemberEntity.
   * A tenant user has many team memberships.
   */
  @OneToMany(() => TenantTeamMemberEntity, (member) => member.user, {
    cascade: true,
  })
  teamMemberships!: TenantTeamMemberEntity[];

  /**
   * One-to-many relationship with `CategoryEntity` for `created_by`.
   *
   * Represents the categories created by this tenant user.
   */
  @OneToMany(() => CategoryEntity, (category) => category.createdByUser)
  createdCategories!: CategoryEntity[];

  /**
   * One-to-many relationship with `CategoryEntity` for `updated_by`.
   *
   * Represents the categories last updated by this tenant user.
   */
  @OneToMany(() => CategoryEntity, (category) => category.updatedByUser)
  updatedCategories!: CategoryEntity[];

  /**
   * Relationship to ProcessTemplateEntity for createdBy.
   * A tenant user can create multiple process templates.
   */
  @OneToMany(
    () => ProcessTemplateEntity,
    (processTemplate) => processTemplate.createdByUser,
  )
  createdProcessTemplates!: ProcessTemplateEntity[];

  /**
   * Relationship to ProcessTemplateEntity for updatedBy.
   * A tenant user can update multiple process templates.
   */
  @OneToMany(
    () => ProcessTemplateEntity,
    (processTemplate) => processTemplate.updatedByUser,
    {
      nullable: true,
    },
  )
  updatedProcessTemplates!: ProcessTemplateEntity[];

  /**
   * Relationship to ProcessTemplateStepEntity for created steps.
   * A tenant user can create multiple steps.
   */
  @OneToMany(() => ProcessTemplateStepEntity, (step) => step.createdByUser)
  createdSteps!: ProcessTemplateStepEntity[];

  /**
   * Relationship to ProcessTemplateStepEntity for updated steps.
   * A tenant user can update multiple steps.
   */
  @OneToMany(() => ProcessTemplateStepEntity, (step) => step.updatedByUser)
  updatedSteps!: ProcessTemplateStepEntity[];

  /**
   * Relationship to ProcessTemplateStepRequirementEntity.
   * A user can create multiple requirements.
   */
  @OneToMany(
    () => ProcessTemplateStepRequirementEntity,
    (requirement) => requirement.createdByUser,
  )
  createdRequirements!: ProcessTemplateStepRequirementEntity[];

  /**
   * Relationship to ProcessTemplateStepRequirementEntity.
   * A user can update multiple requirements.
   */
  @OneToMany(
    () => ProcessTemplateStepRequirementEntity,
    (requirement) => requirement.updatedByUser,
  )
  updatedRequirements!: ProcessTemplateStepRequirementEntity[];

  /**
   * Relationship to ProcessTemplateStepRequirementSubmissionEntity.
   * A tenant user can create multiple submissions.
   */
  @OneToMany(
    () => ProcessTemplateStepRequirementSubmissionEntity,
    (submission) => submission.createdByUser,
  )
  createdSubmissions!: ProcessTemplateStepRequirementSubmissionEntity[];

  /**
   * Relationship to ProcessTemplateStepRequirementSubmissionEntity.
   * A tenant user can review multiple submissions.
   */
  @OneToMany(
    () => ProcessTemplateStepRequirementSubmissionEntity,
    (submission) => submission.reviewedByUser,
  )
  reviewedSubmissions!: ProcessTemplateStepRequirementSubmissionEntity[];

  /**
   * Relationship to ProcessTemplateStepTriggerConditionEntity for createdBy.
   * A user can create multiple trigger conditions.
   */
  @OneToMany(
    () => ProcessTemplateStepTriggerConditionEntity,
    (triggerCondition) => triggerCondition.createdByUser,
  )
  createdConditions!: ProcessTemplateStepTriggerConditionEntity[];

  /**
   * Relationship to ProcessTemplateStepTriggerConditionEntity for updatedBy.
   * A user can update multiple trigger conditions.
   */
  @OneToMany(
    () => ProcessTemplateStepTriggerConditionEntity,
    (triggerCondition) => triggerCondition.updatedByUser,
  )
  updatedConditions!: ProcessTemplateStepTriggerConditionEntity[];

  /**
   * One-to-many relationship to ProjectEntity.
   * A user can create many projects.
   */
  @OneToMany(() => ProjectEntity, (project) => project.createdByUser)
  createdProjects!: ProjectEntity[];

  /**
   * One-to-many relationship to ProjectEntity.
   * A user can update many projects.
   */
  @OneToMany(() => ProjectEntity, (project) => project.updatedByUser)
  updatedProjects!: ProjectEntity[];

  /**
   *One-to-many relationship to ProjectTaskStatusEntity.
   * A user can create multiple task statuses.
   */
  @OneToMany(
    () => ProjectTaskStatusEntity,
    (taskStatus) => taskStatus.createdByUser,
  )
  createdTaskStatuses!: ProjectTaskStatusEntity[];

  /**
   * One-to-many Relationship to ProjectTaskStatusEntity.
   * A user can update multiple task statuses.
   */
  @OneToMany(
    () => ProjectTaskStatusEntity,
    (taskStatus) => taskStatus.updatedByUser,
  )
  updatedTaskStatuses!: ProjectTaskStatusEntity[];

  /**
   * One-to-many relationship to TaskEntity.
   * A user can create multiple tasks.
   */
  @OneToMany(() => TaskEntity, (task) => task.createdByUser)
  createdTasks!: TaskEntity[];

  /**
   * One-to-many relationship to TaskEntity.
   * A user can update multiple tasks.
   */
  @OneToMany(() => TaskEntity, (task) => task.updatedByUser)
  updatedTasks!: TaskEntity[];

  /**
   * Relationship to TenantTeamProjectEntity.
   * A user can create multiple project assignments.
   */
  @OneToMany(
    () => TenantTeamProjectEntity,
    (teamProject) => teamProject.createdByUser,
    {
      cascade: true,
    },
  )
  projectAssignments!: TenantTeamProjectEntity[];

/**
 * Relationship to ProcessInstanceEntity.
 * A tenant user can create multiple process instances.
 */
  @OneToMany(() => ProcessInstanceEntity, (processInstance) => processInstance.createdByUser, {
    cascade: true,
  })
  createdProcessInstances!: ProcessInstanceEntity[];
}
