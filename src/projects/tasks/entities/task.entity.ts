import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { ProjectEntity } from '../../../projects/entities/project.entity';
import { ProjectTaskStatusEntity } from '../../project_task_statuses/entities/project_task_status.entity';
import { TenantUsersEntity } from '../../../tenants/tenant_users/entities/tenant_user.entity';
import { ProcessInstanceStepEntity } from '../../../process_instances/process_instance_steps/entities/process_instance_step.entity';
import { TaskCommentsEntity } from '../comments/entities/comment.entity';
import { TaskAttachmentsEntity } from '../attachments/entities/attachment.entity';
import { TaskMentionsEntity } from '../mentions/entities/mention.entity';
import {TaskDependencyEntity} from "../../../scheduler/entities/task_dependency.entity";


/**
 * Entity class for `tasks`.
 */
@Entity('tasks')
export class TaskEntity {
  @PrimaryGeneratedColumn({
    name: 'task_id',
    type: 'bigint',
    unsigned: true,
  })
  taskId!: number;

  @Column({
    name: 'project_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  @Index('tasks_project_id')
  projectId!: number;

  @Column({
    name: 'task_indentifier',
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true,
  })
  taskIdentifier!: string;

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
    name: 'task_status_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  @Index('tasks_task_status_id')
  taskStatusId!: number;

  @Column({
    name: 'step_instance_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Linked process step instance',
  })
  @Index('tasks_step_instance_id')
  stepInstanceId?: number;

  @Column({
    name: 'priority',
    type: 'enum',
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  priority!: 'low' | 'medium' | 'high';

  @Column({
    name: 'estimated_duration',
    type: 'decimal',
    precision: 10,
    scale: 2,
    unsigned: true,
    nullable: true,
    comment: 'Estimated time in hours (e.g., 8.5 = 8 hours 30 mins)',
  })
  estimatedDuration?: number;

  @Column({
    name: 'parent_task_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'If it is a sub-task',
  })
  parentTaskId?: number;

  @Column({
    name: 'status_control',
    type: 'enum',
    enum: ['manual', 'process', 'hybrid'],
    default: 'manual',
    nullable: false,
  })
  statusControl!: 'manual' | 'process' | 'hybrid';

  @Column({
    name: 'status_locked_until',
    type: 'datetime',
    nullable: true,
  })
  statusLockedUntil?: Date;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Tenant User ID',
  })
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: 'Tenant User ID',
  })
  updatedBy!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
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
   * Relationship to ProjectEntity.
   * A task belongs to one project.
   */
  @ManyToOne(() => ProjectEntity, (project) => project.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  /**
   * Relationship to ProjectTaskStatusEntity.
   * A task has one status.
   */
  @ManyToOne(() => ProjectTaskStatusEntity, (status) => status.tasks, {
    cascade: true,
  })
  @JoinColumn({ name: 'task_status_id' })
  taskStatus!: ProjectTaskStatusEntity;

  /**
   * Relationship to TaskEntity.
   * A task can have a parent task.
   */
  @ManyToOne(() => TaskEntity, (task) => task.subTasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask?: TaskEntity;

  /**
   * Relationship to TenantUsersEntity.
   * A task is created by one user.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdTasks)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity.
   * A task is updated by one user.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.updatedTasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser?: TenantUsersEntity;


  /**
   * Relationship to ProcessInstanceStepEntity.
   * A task can be linked to one process instance step.
   */
  @ManyToOne(() => ProcessInstanceStepEntity, (stepInstance) => stepInstance.tasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'step_instance_id' })
  stepInstance?: ProcessInstanceStepEntity;

  /**
   * Relationship to TaskEntity.
   * A task can have multiple sub-tasks.
   */
  subTasks?: TaskEntity[];

   /**
   * Relationship to ProcessInstanceStepEntity.
   * A task can be linked to one process instance step.
   */
   @OneToOne(
    () => ProcessInstanceStepEntity,
    (linkedStepInstance) => linkedStepInstance.linkedTask,
    { nullable: true, onDelete: 'SET NULL' }
   )
    @JoinColumn({ name: 'step_instance_id' })
    linkedStepInstance?: ProcessInstanceStepEntity;

  /**
   * One-to-many relationship with the `TaskCommentsEntity`.
   * A task can have multiple comments.
   */
  @OneToMany(() => TaskCommentsEntity, (comment) => comment.task, {
    cascade: true,
  })
  comments!: TaskCommentsEntity[];

  /**
   * One-to-many relationship with the `TaskAttachmentsEntity`.
   * A task can have multiple attachments.
   */
  @OneToMany(() => TaskAttachmentsEntity, (attachment) => attachment.task, {
    cascade: true,
  })
  attachments!: TaskAttachmentsEntity[];

   /**
   * One-to-many relationship with the `TaskMentionsEntity`.
   * A task can have multiple mentions.
   */
   @OneToMany(() => TaskMentionsEntity, (mention) => mention.task, {
    cascade: true,
  })
  mentions!: TaskMentionsEntity[];

   /**
   * Inverse relationship to TaskDependencyEntity.
   * A task can have multiple dependencies.
   */
   @OneToMany(() => TaskDependencyEntity, (dependency) => dependency.task, {
    cascade: true,
  })
  dependencies!: TaskDependencyEntity[];

  /**
   * Inverse relationship to TaskDependencyEntity.
   * A task can be depended on by multiple other tasks.
   */
  @OneToMany(() => TaskDependencyEntity, (dependency) => dependency.dependsOnTask, {
    cascade: true,
  })
  dependentTasks!: TaskDependencyEntity[];

}