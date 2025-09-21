import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProcessInstanceStepEntity } from '../../entities/process_instance_step.entity';
import { ProcessTemplateStepTriggerConditionEntity } from '../../../../process_templates/process_template_steps/process_template_step_trigger_conditions/entities/process_template_step_trigger_condition.entity';

/**
 * Entity class for `process_instance_step_triggers` table.
 */
@Entity('process_instance_step_triggers')
export class ProcessInstanceStepTriggerEntity {
  @PrimaryGeneratedColumn({
    name: 'trigger_instance_id',
    type: 'bigint',
    unsigned: true,
  })
  triggerInstanceId!: number;

  @Column({
    name: 'step_instance_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Links to process_instance_steps',
  })
  stepInstanceId!: number;

  @Column({
    name: 'process_template_step_trigger_condition_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Links to process_template_step_trigger_conditions',
  })
  processTemplateStepTriggerConditionId!: number;

  @Column({
    name: 'condition_type',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Type of the condition (e.g., task_completion, time_based)',
  })
  conditionType!: string;

  @Column({
    name: 'condition_key',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Key for the condition (e.g., "firewall_config.json")',
  })
  conditionKey!: string;

  @Column({
    name: 'json_schema',
    type: 'json',
    nullable: false,
    comment: 'Frozen copy of the condition schema',
  })
  jsonSchema!: object;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['unmet', 'met'],
    default: 'unmet',
    comment: 'Status of the trigger condition',
  })
  status!: 'unmet' | 'met';

  @Column({
    name: 'met_at',
    type: 'datetime',
    nullable: true,
    comment: 'Timestamp when the condition was met',
  })
  metAt!: Date | null;

  @Column({
    name: 'last_eval_at',
    type: 'datetime',
    nullable: true,
    comment: 'Timestamp of the last evaluation',
  })
  lastEvalAt!: Date | null;

  /**
   * Relationship to ProcessInstanceStepEntity.
   * A trigger belongs to one process instance step.
   */
  @ManyToOne(() => ProcessInstanceStepEntity, (step) => step.triggers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'step_instance_id' })
  stepInstance!: ProcessInstanceStepEntity;

  /**
   * Relationship to ProcessTemplateStepTriggerConditionEntity.
   * A trigger is based on one process template step trigger condition.
   */
  @ManyToOne(
    () => ProcessTemplateStepTriggerConditionEntity,
    (condition) => condition.triggers,
    {
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'process_template_step_trigger_condition_id' })
  processTemplateStepTriggerCondition!: ProcessTemplateStepTriggerConditionEntity;
}