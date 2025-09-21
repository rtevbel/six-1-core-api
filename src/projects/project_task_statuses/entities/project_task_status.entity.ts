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
import { TenantEntity } from '../../../tenants/entities/tenant.entity';
import { ProjectEntity } from '../../../projects/entities/project.entity';
import { TenantUsersEntity } from '../../../tenants/tenant_users/entities/tenant_user.entity';
import { TaskEntity } from '../../tasks/entities/task.entity';
import { ProjectStepStatusMappingEntity } from '../../entities/project_step_status_mappings.entity';

/**
 * Entity class for `project_task_statuses`.
 */
@Entity('project_task_statuses')
export class ProjectTaskStatusEntity {
  @PrimaryGeneratedColumn({
    name: 'project_task_status_id',
    type: 'bigint',
    unsigned: true,
  })
  projectTaskStatusId!: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Status name like To-DO, InProgress, Ready-for-testing etc.',
  })
  name!: string;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: 'Tenant ID who owns this project status',
  })
  @Index('project_task_statuses_tenant_id')
  tenantId!: number;

  @Column({
    name: 'project_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  @Index('project_task_statuses_project_id')
  projectId!: number;

  @Column({
    name: 'status_order',
    type: 'int',
    nullable: false,
    default: 1,
    comment: 'Defines the order of status in the project',
  })
  @Index('project_task_statuses_status_order')
  statusOrder!: number;

  @Column({
    name: 'color',
    type: 'varchar',
    length: 16,
    nullable: true,
    comment: 'Colour of status',
  })
  color?: string;

  @Column({
    name: 'is_system',
    type: 'tinyint',
    width: 1,
    nullable: false,
    default: 0,
    comment: 'Protected status created by system',
  })
  isSystem!: boolean;

  @Column({
    name: 'blocks_completion',
    type: 'tinyint',
    width: 1,
    nullable: false,
    default: 0,
    comment: 'Cannot complete if any task is in such a column',
  })
  blocksCompletion!: boolean;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Tenant User ID who created this status',
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
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  /**
   * Relationship to TenantEntity.
   * A task status belongs to one tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.projectTaskStatuses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  /**
   * Relationship to ProjectEntity.
   * A task status belongs to one project.
   */
  @ManyToOne(() => ProjectEntity, (project) => project.taskStatuses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  /**
   * Relationship to TenantUsersEntity.
   * A task status is created by one user.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdTaskStatuses)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity.
   * A task status is updated by one user.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.updatedTaskStatuses, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser?: TenantUsersEntity;

  /**
   * Relationship to TaskEntity.
   * A task status can be associated with multiple tasks.
   */
  @OneToMany(() => TaskEntity, (task) => task.taskStatus)
  tasks!: TaskEntity[];

  /**
   * Relationship to ProjectStepStatusMappingEntity.
   * A task status can have multiple step status mappings.
   */
  @OneToMany(
    () => ProjectStepStatusMappingEntity,
    (stepStatusMapping) => stepStatusMapping.taskStatus,
    {
      cascade: true,
    },
  )
  stepStatusMappings!: ProjectStepStatusMappingEntity[];
}