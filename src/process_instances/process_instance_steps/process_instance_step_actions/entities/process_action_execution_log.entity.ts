import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type {
  ProcessStepActionRunOn,
  ProcessStepActionType,
} from '../../../../automation/process-step-action.constants';
import { ProcessInstanceStepActionEntity } from './process_instance_step_action.entity';

@Entity('process_action_execution_log')
@Unique('uq_process_action_execution_instance_action', ['instanceStepActionId'])
export class ProcessActionExecutionLogEntity {
  @PrimaryGeneratedColumn({
    name: 'execution_id',
    type: 'bigint',
    unsigned: true,
  })
  executionId!: number;

  @Column({
    name: 'instance_step_action_id',
    type: 'bigint',
    unsigned: true,
  })
  instanceStepActionId!: number;

  @Column({
    name: 'step_instance_id',
    type: 'bigint',
    unsigned: true,
  })
  stepInstanceId!: number;

  @Column({
    name: 'process_instance_id',
    type: 'bigint',
    unsigned: true,
  })
  processInstanceId!: number;

  @Column({
    name: 'run_on',
    type: 'enum',
    enum: ['step_completed', 'process_completed', 'step_failed'],
  })
  runOn!: ProcessStepActionRunOn;

  @Column({
    name: 'action_type',
    type: 'enum',
    enum: ['emit_event', 'send_notification', 'update_sor_field', 'call_webhook', 'generate_verification_token', 'onboard_tenant'],
  })
  actionType!: ProcessStepActionType;

  @Column({ name: 'status', type: 'varchar', length: 32, default: 'pending' })
  status!: 'pending' | 'succeeded' | 'failed';

  @Column({ name: 'result', type: 'json', nullable: true })
  result?: Record<string, unknown> | null;

  @Column({ name: 'error_message', type: 'varchar', length: 2048, nullable: true })
  errorMessage?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @ManyToOne(() => ProcessInstanceStepActionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instance_step_action_id' })
  instanceStepAction?: ProcessInstanceStepActionEntity;
}
