import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ProcessInstanceStepEntity } from './process_instance_step.entity';

@Entity('process_instance_step_assignees')
@Unique('uq_instance_step_assignee_user', ['stepInstanceId', 'tenantUserId'])
export class ProcessInstanceStepAssigneeEntity {
  @PrimaryGeneratedColumn({
    name: 'instance_step_assignee_id',
    type: 'bigint',
    unsigned: true,
  })
  instanceStepAssigneeId!: number;

  @Column({
    name: 'step_instance_id',
    type: 'bigint',
    unsigned: true,
  })
  stepInstanceId!: number;

  @Column({
    name: 'tenant_user_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantUserId!: number;

  @Column({
    name: 'assignment_order',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  assignmentOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @ManyToOne(() => ProcessInstanceStepEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'step_instance_id' })
  stepInstance?: ProcessInstanceStepEntity;
}
