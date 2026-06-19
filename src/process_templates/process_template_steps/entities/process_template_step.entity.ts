import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ProcessTemplateEntity } from '../../entities/process_template.entity';
import { TenantUsersEntity } from '../../../tenants/tenant_users/entities/tenant_user.entity';
import { ProcessTemplateStepDescriptionEntity } from './process_template_step_description.entity';
import { ProcessTemplateStepRequirementEntity } from '../process_template_step_requirements/entities/process_template_step_requirement.entity';
import { ProcessTemplateStepObjectBindingEntity } from '../process_template_step_object_bindings/entities/process_template_step_object_binding.entity';
import { ProcessTemplateStepActionEntity } from '../process_template_step_actions/entities/process_template_step_action.entity';
import { TaskEntity } from '../../../projects/tasks/entities/task.entity';
import { ProcessInstanceStepEntity } from '../../../process_instances/process_instance_steps/entities/process_instance_step.entity';
import type { ProcessStepAssigneeSpec } from '../../../automation/process-step-assignee-spec.types';

/**
 * Entity class for `process_template_steps` table.
 */
@Entity('process_template_steps')
export class ProcessTemplateStepEntity {
  @PrimaryGeneratedColumn({
    name: 'process_template_step_id',
    type: 'bigint',
    unsigned: true,
  })
  processTemplateStepId!: number;

  @Column({
    name: 'process_template_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Links to process_templates',
  })
  processTemplateId!: number;

  @Column({
    name: 'task_type',
    type: 'enum',
    enum: ['manual', 'automated', 'call_process', 'config_object'],
    default: 'manual',
    comment: 'Step execution type',
  })
  taskType!: 'manual' | 'automated' | 'call_process' | 'config_object';

  @Column({
    name: 'child_template_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Child process template when task_type=call_process',
  })
  childTemplateId!: number | null;

  @Column({
    name: 'child_subject_policy',
    type: 'enum',
    enum: ['inherit', 'workflow', 'config_instance'],
    default: 'workflow',
    nullable: false,
  })
  childSubjectPolicy!: 'inherit' | 'workflow' | 'config_instance';

  @Column({
    name: 'child_context_patch',
    type: 'json',
    nullable: true,
  })
  childContextPatch!: Record<string, unknown> | null;

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
  })
  isOptional!: boolean;

  @Column({
    name: 'required_permissions',
    type: 'json',
    nullable: true,
    comment: 'Permission keys required to complete this step',
  })
  requiredPermissions!: string[] | null;

  @Column({
    name: 'step_extensions_json',
    type: 'json',
    nullable: true,
    comment: 'Runner extensions: visibleWhen, ui, parallelGroupId, allowSkip',
  })
  stepExtensionsJson!: Record<string, unknown> | null;

  @Column({
    name: 'assignee_spec',
    type: 'json',
    nullable: true,
    comment:
      'Runtime assignee resolution spec (RecipientSpec shape; resolved at step ready)',
  })
  assigneeSpec!: ProcessStepAssigneeSpec | null;

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
    nullable: true,
    comment: 'Tenant User ID',
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
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;

  /**
   * Relationship to ProcessTemplateEntity.
   * A step belongs to one process template.
   */
  @ManyToOne(
    () => ProcessTemplateEntity,
    (processTemplate) => processTemplate.steps,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'process_template_id' })
  processTemplate!: ProcessTemplateEntity;

  /**
   * Relationship to TenantUsersEntity for createdBy.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdSteps)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for updatedBy.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.updatedSteps, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: TenantUsersEntity;

  /**
   * Relationship to ProcessTemplateStepDescriptionEntity.
   * A step can have multiple descriptions.
   */
  @OneToMany(
    () => ProcessTemplateStepDescriptionEntity,
    (description) => description.processTemplateStep,
    {
      cascade: true,
    },
  )
  descriptions!: ProcessTemplateStepDescriptionEntity[];

  /**
   * Relationship to ProcessTemplateStepRequirementEntity.
   * A step can have multiple requirements.
   */
  @OneToMany(
    () => ProcessTemplateStepRequirementEntity,
    (requirement) => requirement.processTemplateStep,
    {
      cascade: true,
    },
  )
  requirements!: ProcessTemplateStepRequirementEntity[];

  /**
   * Configurable object bindings declared on this template step.
   */
  @OneToMany(
    () => ProcessTemplateStepObjectBindingEntity,
    (binding) => binding.processTemplateStep,
    { cascade: true },
  )
  objectBindings!: ProcessTemplateStepObjectBindingEntity[];

  /**
   * Lifecycle actions (notify, write-back, webhooks) on this template step.
   */
  @OneToMany(
    () => ProcessTemplateStepActionEntity,
    (action) => action.processTemplateStep,
    { cascade: true },
  )
  stepActions!: ProcessTemplateStepActionEntity[];

  /**
   * Reverse relationship to ProcessInstanceStepEntity.
   * A process template step can be linked to multiple process instance steps.
   */
  @OneToMany(
    () => ProcessInstanceStepEntity,
    (processInstanceStep) => processInstanceStep.processTemplateStep,
  )
  processInstanceSteps!: ProcessInstanceStepEntity[];
}
