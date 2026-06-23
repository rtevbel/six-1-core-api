import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { ProcessTemplateEntity } from '../../process_templates/entities/process_template.entity';
import { ProcessInstanceStepEntity } from '../process_instance_steps/entities/process_instance_step.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';

/**
 * Entity class for `process_instances` table.
 *
 * Represents the process instances in the system.
 */
@Entity('process_instances')
export class ProcessInstanceEntity {
  @PrimaryGeneratedColumn({
    name: 'process_instance_id',
    type: 'bigint',
    unsigned: true,
  })
  processInstanceId!: number;

  @Column({
    name: 'process_template_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  processTemplateId!: number;

  @Column({
    name: 'parent_instance_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Parent process instance for chaining',
  })
  parentInstanceId!: number | null;

  @Column({
    name: 'parent_step_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Parent process step that spawned this instance',
  })
  parentStepId!: number | null;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  tenantId!: number;

  @Column({
    name: 'subject_type',
    type: 'varchar',
    length: 64,
    nullable: false,
    comment:
      'Job anchor: project, scheduled_task, config_custom_object_instance, workflow, sor_entity',
  })
  subjectType!: string;

  @Column({
    name: 'subject_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'PK of subject row, or process_instance_id for workflow self-subject',
  })
  subjectId!: number;

  @Column({
    name: 'subject_metadata',
    type: 'json',
    nullable: true,
    comment: 'Optional snapshot for hosts and UI (objectType, configObjectId, etc.)',
  })
  subjectMetadata!: Record<string, unknown> | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['draft', 'active', 'completed', 'canceled'],
    default: 'active',
  })
  status!: 'draft' | 'active' | 'completed' | 'canceled';

  @Column({
    name: 'on_child_failure',
    type: 'enum',
    enum: ['ignore', 'pause_parent', 'fail_parent'],
    default: 'pause_parent',
    comment: 'Determines how parent behaves when a child instance fails',
  })
  onChildFailure!: 'ignore' | 'pause_parent' | 'fail_parent';

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  createdBy!: number;

  @CreateDateColumn({
    name: 'started_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  startedAt!: Date;

  @Column({
    name: 'completed_at',
    type: 'datetime',
    nullable: true,
  })
  completedAt!: Date | null;

  @Column({
    name: 'canceled_at',
    type: 'datetime',
    nullable: true,
  })
  canceledAt!: Date | null;

  @Column({
    name: 'correlation_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  correlationId!: string | null;

  @Column({
    name: 'context',
    type: 'json',
    nullable: true,
    comment: 'Shared JSON context for this instance and its steps/children',
  })
  context!: Record<string, unknown> | null;

  /**
   * Relationship to ProcessTemplateEntity.
   * A process instance is based on one process template.
   */
  @ManyToOne(
    () => ProcessTemplateEntity,
    (template) => template.processInstances,
    {
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'process_template_id' })
  processTemplate!: ProcessTemplateEntity;

  /**
   * Relationship to TenantEntity.
   * A process instance belongs to one tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.processInstances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  /**
   * Relationship to TenantUsersEntity.
   * A process instance is created by one tenant user.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdProcessInstances)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Self-referential relationship for parent process instance.
   */
  @ManyToOne(
    () => ProcessInstanceEntity,
    (parentInstance) => parentInstance.childInstances,
    {
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'parent_instance_id' })
  parentInstance!: ProcessInstanceEntity | null;

  /**
   * Reverse relationship to child process instances.
   */
  @OneToMany(
    () => ProcessInstanceEntity,
    (childInstance) => childInstance.parentInstance,
  )
  childInstances!: ProcessInstanceEntity[];

  /**
   * Relationship to the parent step that spawned this process instance.
   */
  @ManyToOne(
    () => ProcessInstanceStepEntity,
    (step) => step.childInstances,
    {
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'parent_step_id' })
  parentStep!: ProcessInstanceStepEntity | null;

  /**
   * Reverse relationship to ProcessInstanceStepEntity.
   * A process instance can have multiple steps.
   */
  @OneToMany(
    () => ProcessInstanceStepEntity,
    (processInstanceStep) => processInstanceStep.processInstance,
  )
  steps!: ProcessInstanceStepEntity[];

  /**
   * One-to-many relationship with the `ProjectEntity`.
   * A process instance can have multiple projects linked to it.
   */
  @OneToMany(() => ProjectEntity, (project) => project.processInstance)
  projects?: ProjectEntity[];
}
