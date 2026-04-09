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
import { TaskEntity } from '../../../projects/tasks/entities/task.entity';

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
    enum: ['manual', 'automated'],
    nullable: false,
    comment: 'Task type: manual or automated',
  })
  taskType!: 'manual' | 'automated';

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
    name: 'status',
    type: 'enum',
    enum: [
      'pending',
      'ready',
      'in_progress',
      'blocked',
      'completed',
      'canceled',
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
    | 'canceled';

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
