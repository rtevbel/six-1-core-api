import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProcessTemplateStepEntity } from '../../entities/process_template_step.entity';
import { TenantUsersEntity } from '../../../../tenants/tenant_users/entities/tenant_user.entity';
import type {
  ProcessStepActionRunOn,
  ProcessStepActionType,
} from '../../../../automation/process-step-action.constants';
import type { ProcessStepActionConfig } from '../../../../automation/process-step-action.types';
import { ProcessInstanceStepActionEntity } from '../../../../process_instances/process_instance_steps/process_instance_step_actions/entities/process_instance_step_action.entity';

@Entity('process_template_step_actions')
export class ProcessTemplateStepActionEntity {
  @PrimaryGeneratedColumn({
    name: 'step_action_id',
    type: 'bigint',
    unsigned: true,
  })
  stepActionId!: number;

  @Column({
    name: 'process_template_step_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  processTemplateStepId!: number;

  @Column({
    name: 'action_type',
    type: 'enum',
    enum: [
      'emit_event',
      'send_notification',
      'update_sor_field',
      'call_webhook',
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

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    default: 0,
    nullable: true,
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

  @ManyToOne(() => ProcessTemplateStepEntity, (step) => step.stepActions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'process_template_step_id' })
  processTemplateStep!: ProcessTemplateStepEntity;

  @ManyToOne(() => TenantUsersEntity)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  @ManyToOne(() => TenantUsersEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: TenantUsersEntity;

  @OneToMany(
    () => ProcessInstanceStepActionEntity,
    (row) => row.templateStepAction,
  )
  instanceRows!: ProcessInstanceStepActionEntity[];
}
