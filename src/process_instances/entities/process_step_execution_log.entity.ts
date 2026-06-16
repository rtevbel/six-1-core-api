import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type {
  ProcessStepExecutionCause,
  ProcessStepExecutionEvent,
} from '../process-step-execution-log.constants';
import { ProcessInstanceEntity } from './process_instance.entity';
import { ProcessInstanceStepEntity } from '../process_instance_steps/entities/process_instance_step.entity';

@Entity('process_step_execution_log')
export class ProcessStepExecutionLogEntity {
  @PrimaryGeneratedColumn({
    name: 'log_id',
    type: 'bigint',
    unsigned: true,
  })
  logId!: number;

  @Column({
    name: 'process_instance_id',
    type: 'bigint',
    unsigned: true,
  })
  processInstanceId!: number;

  @Column({
    name: 'step_instance_id',
    type: 'bigint',
    unsigned: true,
  })
  stepInstanceId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantId!: number;

  @Column({
    name: 'step_order',
    type: 'int',
    unsigned: true,
  })
  stepOrder!: number;

  @Column({ name: 'step_name', type: 'varchar', length: 255, nullable: true })
  stepName?: string | null;

  @Column({
    name: 'event',
    type: 'enum',
    enum: [
      'step_ready',
      'step_started',
      'step_completed',
      'step_canceled',
      'step_blocked',
      'step_skipped',
      'step_failed',
      'step_retry',
      'step_rollback',
    ],
  })
  event!: ProcessStepExecutionEvent;

  @Column({
    name: 'previous_status',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  previousStatus?: string | null;

  @Column({ name: 'new_status', type: 'varchar', length: 32 })
  newStatus!: string;

  @Column({
    name: 'cause',
    type: 'enum',
    enum: ['manual', 'event', 'timer', 'system'],
    nullable: true,
  })
  cause?: ProcessStepExecutionCause | null;

  @Column({
    name: 'actor_tenant_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  actorTenantUserId?: number | null;

  @Column({
    name: 'correlation_id',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  correlationId?: string | null;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @Column({
    name: 'occurred_at',
    type: 'datetime',
    precision: 6,
  })
  occurredAt!: Date;

  @ManyToOne(() => ProcessInstanceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'process_instance_id' })
  processInstance?: ProcessInstanceEntity;

  @ManyToOne(() => ProcessInstanceStepEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'step_instance_id' })
  stepInstance?: ProcessInstanceStepEntity;
}
