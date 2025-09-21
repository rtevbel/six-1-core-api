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
import { ProcessTemplateStepEntity } from '../../entities/process_template_step.entity';
import { TenantUsersEntity } from '../../../../tenants/tenant_users/entities/tenant_user.entity';
import { ProcessTemplateStepTriggerConditionSubmissionEntity } from '../../process_template_step_trigger_condition_submissions/entities/process_template_step_trigger_condition_submission.entity';
import { ProcessInstanceStepTriggerEntity } from '../../../../process_instances/process_instance_steps/process_instance_step_trigger_conditions/entities/process_instance_step_trigger_condition.entity';

/**
 * Entity class for `process_template_step_trigger_conditions` table.
 */
@Entity('process_template_step_trigger_conditions')
export class ProcessTemplateStepTriggerConditionEntity {
  @PrimaryGeneratedColumn({
    name: 'step_trigger_condition_id',
    type: 'bigint',
    unsigned: true,
  })
  stepTriggerConditionId!: number;

  @Column({
    name: 'process_template_step_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Links to process_template_steps',
  })
  processTemplateStepId!: number;

  @Column({
    name: 'condition_type',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'e.g., task_completion, time_based, manual_approval etc.',
  })
  conditionType!: string;

  @Column({
    name: 'condition_key',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Example: "firewall_config.json", "IT Manager Approval"',
  })
  conditionKey!: string;

  @Column({
    name: 'json_schema',
    type: 'json',
    nullable: false,
    comment: 'Details of the condition (e.g., task ID, time delay)',
  })
  jsonSchema!: object;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'User ID from tenant_users table',
  })
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    default: 0,
    nullable: true,
    comment: 'User ID from tenant_users table',
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
   * Relationship to ProcessTemplateStepEntity.
   * A trigger condition belongs to one process template step.
   */
  @ManyToOne(
    () => ProcessTemplateStepEntity,
    (processTemplateStep) => processTemplateStep.requirements,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'process_template_step_id' })
  processTemplateStep!: ProcessTemplateStepEntity;

  /**
   * Relationship to TenantUsersEntity for createdBy.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdConditions)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for updatedBy.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.updatedConditions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: TenantUsersEntity;

  /**
   * Relationship to ProcessTemplateStepTriggerConditionSubmissionEntity.
   * A trigger condition can have multiple submissions.
   */
  @OneToMany(
    () => ProcessTemplateStepTriggerConditionSubmissionEntity,
    (submission) => submission.stepTriggerCondition,
    {
      cascade: true,
    },
  )
  submissions!: ProcessTemplateStepTriggerConditionSubmissionEntity[];

  /**
   * Relationship to ProcessInstanceStepTriggerEntity.
   * A condition can have multiple triggers.
   */
  @OneToMany(
    () => ProcessInstanceStepTriggerEntity,
    (trigger) => trigger.processTemplateStepTriggerCondition,
    {
      cascade: true,
    },
  )
  triggers!: ProcessInstanceStepTriggerEntity[];
}
