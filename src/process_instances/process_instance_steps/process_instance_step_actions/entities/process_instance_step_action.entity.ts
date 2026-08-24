import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProcessInstanceStepEntity } from '../../entities/process_instance_step.entity';
import { ProcessTemplateStepActionEntity } from '../../../../process_templates/process_template_steps/process_template_step_actions/entities/process_template_step_action.entity';
import type {
  ProcessStepActionRunOn,
  ProcessStepActionType,
} from '../../../../automation/process-step-action.constants';
import type { ProcessStepActionConfig } from '../../../../automation/process-step-action.types';

@Entity('process_instance_step_actions')
export class ProcessInstanceStepActionEntity {
  @PrimaryGeneratedColumn({
    name: 'instance_step_action_id',
    type: 'bigint',
    unsigned: true,
  })
  instanceStepActionId!: number;

  @Column({
    name: 'step_instance_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  stepInstanceId!: number;

  @Column({
    name: 'template_step_action_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  templateStepActionId!: number | null;

  @Column({
    name: 'action_type',
    type: 'enum',
    enum: [
      'emit_event',
      'send_notification',
      'update_sor_field',
      'call_webhook',
      'generate_verification_token',
      'onboard_tenant',
    ],
  })
  actionType!: ProcessStepActionType;

  @Column({
    name: 'run_on',
    type: 'enum',
    enum: ['step_completed', 'process_completed', 'step_failed'],
  })
  runOn!: ProcessStepActionRunOn;

  @Column({
    name: 'config',
    type: 'json',
    nullable: false,
  })
  config!: ProcessStepActionConfig;

  @Column({
    name: 'order_index',
    type: 'int',
    default: 0,
  })
  orderIndex!: number;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    default: 1,
  })
  isActive!: boolean;

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

  @ManyToOne(() => ProcessInstanceStepEntity, (step) => step.stepActions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'step_instance_id' })
  processInstanceStep!: ProcessInstanceStepEntity;

  @ManyToOne(
    () => ProcessTemplateStepActionEntity,
    (action) => action.instanceRows,
    { onDelete: 'SET NULL', nullable: true },
  )
  @JoinColumn({ name: 'template_step_action_id' })
  templateStepAction!: ProcessTemplateStepActionEntity | null;
}
