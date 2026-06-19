import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ProcessInstanceEntity } from '../../entities/process_instance.entity';
import { ProcessTemplateStepEntity } from '../../../process_templates/process_template_steps/entities/process_template_step.entity';
import { ProcessInstanceStepRequirementEntity } from '../process_instance_step_requirements/entities/process_instance_step_requirement.entity';
import { ProcessInstanceStepTriggerEntity } from '../process_instance_step_trigger_conditions/entities/process_instance_step_trigger_condition.entity';
import { ProcessInstanceStepObjectInstanceEntity } from '../process_instance_step_object_instances/entities/process_instance_step_object_instance.entity';
import { ProcessInstanceStepActionEntity } from '../process_instance_step_actions/entities/process_instance_step_action.entity';
import { TaskEntity } from '../../../projects/tasks/entities/task.entity';
import type { ProcessStepAssigneeSpec } from '../../../automation/process-step-assignee-spec.types';

/**
 * Entity class for `process_instance_steps` table.
 */
@Entity('process_instance_steps')
export class ProcessInstanceStepEntity {
  @PrimaryGeneratedColumn({
    name: 'step_instance_id',
    type: 'bigint',
    unsigned: true,
  })
  stepInstanceId!: number;

  @Column({
    name: 'process_instance_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Links to process_instances',
  })
  processInstanceId!: number;

  @Column({
    name: 'process_template_step_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Links to process_template_steps',
  })
  processTemplateStepId!: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Denormalized for quick UI',
  })
  name!: string | null;

  @Column({
    name: 'task_type',
    type: 'enum',
    enum: ['manual', 'automated', 'call_process', 'config_object'],
    nullable: false,
    comment: 'Task type copied from template step',
  })
  taskType!: 'manual' | 'automated' | 'call_process' | 'config_object';

  @Column({
    name: 'step_order',
    type: 'int',
    nullable: false,
    comment: 'Defines the order of steps in the process',
  })
  stepOrder!: number;

  @Column({
    name: 'is_optional',
    type: 'tinyint',
    default: 0,
    comment: 'Indicates if the step is optional',
  })
  isOptional!: boolean;

  @Column({
    name: 'required_permissions',
    type: 'json',
    nullable: true,
    comment: 'Copied from template at instantiation',
  })
  requiredPermissions!: string[] | null;

  @Column({
    name: 'step_extensions_json',
    type: 'json',
    nullable: true,
    comment:
      'Runner extensions copied from template at instantiation (visibleWhen, allowSkip, etc.)',
  })
  stepExtensionsJson!: Record<string, unknown> | null;

  @Column({
    name: 'assignee_spec',
    type: 'json',
    nullable: true,
    comment: 'Snapshot of template assignee_spec at instantiation',
  })
  assigneeSpec!: ProcessStepAssigneeSpec | null;

  @Column({
    name: 'parallel_group_id',
    type: 'varchar',
    length: 64,
    nullable: true,
    comment:
      'Runner v3: denormalized parallel group id (from step_extensions_json.parallelGroupId)',
  })
  parallelGroupId!: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: [
      'pending',
      'ready',
      'in_progress',
      'blocked',
      'completed',
      'canceled',
      'skipped',
      'failed',
    ],
    default: 'pending',
    comment: 'Current status of the step',
  })
  status!:
    | 'pending'
    | 'ready'
    | 'in_progress'
    | 'blocked'
    | 'completed'
    | 'canceled'
    | 'skipped'
    | 'failed';

  @Column({
    name: 'blocked_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Reason why the step is blocked',
  })
  blockedReason!: string | null;

  @Column({
    name: 'ready_at',
    type: 'datetime',
    nullable: true,
    comment: 'Timestamp when the step became ready',
  })
  readyAt!: Date | null;

  @Column({
    name: 'started_at',
    type: 'datetime',
    nullable: true,
    comment: 'Timestamp when the step started',
  })
  startedAt!: Date | null;

  @Column({
    name: 'completed_at',
    type: 'datetime',
    nullable: true,
    comment: 'Timestamp when the step was completed',
  })
  completedAt!: Date | null;

  @Column({
    name: 'canceled_at',
    type: 'datetime',
    nullable: true,
    comment: 'Timestamp when the step was canceled',
  })
  canceledAt!: Date | null;

  @Column({
    name: 'version',
    type: 'int',
    unsigned: true,
    default: 0,
    comment: 'Optimistic lock version',
  })
  version!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
    comment: 'Timestamp when the step was created',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
    comment: 'Timestamp when the step was last updated',
  })
  updatedAt!: Date;

  /**
   * Relationship to ProcessInstanceEntity.
   * A step belongs to one process instance.
   */
  @ManyToOne(
    () => ProcessInstanceEntity,
    (processInstance) => processInstance.steps,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'process_instance_id' })
  processInstance!: ProcessInstanceEntity;

  /**
   * Relationship to ProcessTemplateStepEntity.
   * A step is linked to one process template step.
   */
  @ManyToOne(
    () => ProcessTemplateStepEntity,
    (processTemplateStep) => processTemplateStep.processInstanceSteps,
    {
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'process_template_step_id' })
  processTemplateStep!: ProcessTemplateStepEntity;

  /**
   * Relationship to ProcessInstanceStepRequirementEntity.
   * A process instance step can have multiple requirements.
   */
  @OneToMany(
    () => ProcessInstanceStepRequirementEntity,
    (requirement) => requirement.processInstanceStep,
    {
      cascade: true,
    },
  )
  requirements!: ProcessInstanceStepRequirementEntity[];

  /**
   * Relationship to ProcessInstanceStepTriggerEntity.
   * A step can have multiple triggers.
   */
  @OneToMany(
    () => ProcessInstanceStepTriggerEntity,
    (trigger) => trigger.stepInstance,
    {
      cascade: true,
    },
  )
  triggers!: ProcessInstanceStepTriggerEntity[];

  /**
   * Runtime configurable object instances linked to this step.
   */
  @OneToMany(
    () => ProcessInstanceStepObjectInstanceEntity,
    (row) => row.processInstanceStep,
    { cascade: true },
  )
  objectInstances!: ProcessInstanceStepObjectInstanceEntity[];

  /**
   * Copied lifecycle actions for this step instance.
   */
  @OneToMany(
    () => ProcessInstanceStepActionEntity,
    (action) => action.processInstanceStep,
    { cascade: true },
  )
  stepActions!: ProcessInstanceStepActionEntity[];

  /**
   * Relationship to TaskEntity.
   * A process instance step can have multiple tasks linked to it.
   */
  @OneToMany(() => TaskEntity, (task) => task.stepInstance, {
    cascade: true,
  })
  tasks!: TaskEntity[];

  /**
   * Relationship to TaskEntity.
   * A process instance step can be linked to one task.
   */
  @OneToOne(() => TaskEntity, (linkedTask) => linkedTask.linkedStepInstance, {
    nullable: true,
  })
  linkedTask?: TaskEntity;

  /**
   * Reverse relationship to child process instances spawned from this step.
   */
  @OneToMany(
    () => ProcessInstanceEntity,
    (childInstance) => childInstance.parentStep,
  )
  childInstances!: ProcessInstanceEntity[];
}
