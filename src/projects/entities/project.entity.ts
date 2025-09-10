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
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { ProcessTemplateEntity } from '../../process_templates/entities/process_template.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { ProjectTaskStatusEntity } from '../../projects/project_task_statuses/entities/project_task_status.entity';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';
import { TenantTeamProjectEntity } from '../../tenants/tenant_teams/tenant_team_projects/entities/tenant_team_project.entity';
/**
 * Entity class for `projects` table.
 */
@Entity('projects')
export class ProjectEntity {
  @PrimaryGeneratedColumn({
    name: 'project_id',
    type: 'bigint',
    unsigned: true,
  })
  projectId!: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    name: 'project_indentifier',
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: false,
  })
  projectIdentifier!: string;

  @Column({
    name: 'parent_project_id',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: 'Helps to split project into phases',
  })
  @Index('projects_parent_project_id')
  parentProjectId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Who owns this project?',
  })
  @Index('projects_tenant_id')
  tenantId!: number;

  @Column({
    name: 'process_template_id',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: 'Linked process template, if project follows custom workflow',
  })
  processTemplateId!: number;

  @Column({
    name: 'is_shared',
    type: 'boolean',
    default: false,
    comment: 'Can be shared across companies?',
  })
  @Index('projects_is_shared')
  isShared!: boolean;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'User who created this project',
  })
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    default: 0,
  })
  updatedBy!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  /**
   * Relationship to TenantEntity.
   * A project belongs to one tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.projects, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  /**
   * Relationship to ProcessTemplateEntity.
   * A project can optionally have one process template.
   */
  @ManyToOne(
    () => ProcessTemplateEntity,
    (processTemplate) => processTemplate.projects,
  )
  @JoinColumn({ name: 'process_template_id' })
  processTemplate?: ProcessTemplateEntity;

  /**
   * Relationship to TenantUsersEntity.
   * A project is created by one user.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdProjects)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity.
   * A project is updated by one user.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.updatedProjects, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser?: TenantUsersEntity;

  /**
   * Relationship to TaskEntity.
   * A project can have multiple tasks.
   */
  @OneToMany(() => TaskEntity, (task) => task.project, {
   cascade:true
  })
  tasks!: TaskEntity[];

   /**
   * Relationship to ProjectTaskStatusEntity.
   * A project can have multiple task statuses.
   */
   @OneToMany(() => ProjectTaskStatusEntity, (taskStatus) => taskStatus.project ,{
     cascade:true
   })
   taskStatuses!: ProjectTaskStatusEntity[];

   /**
   * Relationship to TenantTeamProjectEntity.
   * A project can have multiple team assignments.
   */
  @OneToMany(
    () => TenantTeamProjectEntity,
    (teamProject) => teamProject.project,
    {
      cascade: true,
    },
  )
  teamAssignments!: TenantTeamProjectEntity[];
}
