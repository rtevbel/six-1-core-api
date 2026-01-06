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
import { ProcessInstanceEntity } from '../../process_instances/entities/process_instance.entity';
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
    name: 'process_instance_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Linked process instance, if project follows a custom workflow',
  })
  @Index('projects_process_instance_id')
  processInstanceId?: number;

  @Column({
    name: 'is_shared',
    type: 'boolean',
    default: false,
    comment: 'Can be shared across companies?',
  })
  @Index('projects_is_shared')
  isShared!: boolean;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['active', 'completed', 'canceled', 'on_hold', 'archived'],
    default: 'active',
    comment: 'Current status of the project',
  })
  @Index('projects_status')
  status!: 'active' | 'completed' | 'canceled' | 'on_hold' | 'archived';

  @Column({
    name: 'completed_at',
    type: 'datetime',
    nullable: true,
    comment: 'Timestamp when the project was completed',
  })
  completedAt?: Date;

  @Column({
    name: 'canceled_at',
    type: 'datetime',
    nullable: true,
    comment: 'Timestamp when the project was canceled',
  })
  canceledAt?: Date;

  @Column({
    name: 'on_hold_at',
    type: 'datetime',
    nullable: true,
    comment: 'Timestamp when the project was put on hold',
  })
  onHoldAt?: Date;

  @Column({
    name: 'steps_total',
    type: 'int',
    unsigned: true,
    nullable: true,
    comment: 'Total number of steps in the project',
  })
  stepsTotal?: number;

  @Column({
    name: 'steps_completed',
    type: 'int',
    unsigned: true,
    nullable: true,
    comment: 'Number of completed steps in the project',
  })
  stepsCompleted?: number;

  @Column({
    name: 'tasks_total',
    type: 'int',
    unsigned: true,
    nullable: true,
    comment: 'Total number of tasks in the project',
  })
  tasksTotal?: number;

  @Column({
    name: 'tasks_completed',
    type: 'int',
    unsigned: true,
    nullable: true,
    comment: 'Number of completed tasks in the project',
  })
  tasksCompleted?: number;

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
   * Many-to-one relationship with the `TenantEntity`.
   * A project belongs to a single tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.projects, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  /**
   * Many-to-one relationship with the `ProcessInstanceEntity`.
   * A project can optionally be linked to a process instance.
   */
  @ManyToOne(
    () => ProcessInstanceEntity,
    (processInstance) => processInstance.projects,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'process_instance_id' })
  processInstance?: ProcessInstanceEntity;

  /**
   * Many-to-one relationship with the `TenantUsersEntity` for the user who created the project.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdProjects)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Many-to-one relationship with the `TenantUsersEntity` for the user who last updated the project.
   * This relationship is nullable and uses `SET NULL` on delete.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.updatedProjects, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser?: TenantUsersEntity;

  /**
   * One-to-many relationship with the `TaskEntity`.
   * A project can have multiple tasks.
   */
  @OneToMany(() => TaskEntity, (task) => task.project, {
    cascade: true,
  })
  tasks!: TaskEntity[];

  /**
   * One-to-many relationship with the `ProjectTaskStatusEntity`.
   * A project can have multiple task statuses.
   */
  @OneToMany(
    () => ProjectTaskStatusEntity,
    (taskStatus) => taskStatus.project,
    {
      cascade: true,
    },
  )
  taskStatuses!: ProjectTaskStatusEntity[];

  /**
   * One-to-many relationship with the `TenantTeamProjectEntity`.
   * A project can be assigned to multiple tenant teams.
   */
  @OneToMany(
    () => TenantTeamProjectEntity,
    (teamProject) => teamProject.project,
    {
      cascade: true,
    },
  )
  teamAssignments!: TenantTeamProjectEntity[];

  public getId() {
    return this.projectId;
  }
}
