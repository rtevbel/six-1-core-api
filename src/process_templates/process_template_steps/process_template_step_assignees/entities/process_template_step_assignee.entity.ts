import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ProcessTemplateStepEntity } from '../../entities/process_template_step.entity';

@Entity('process_template_step_assignees')
@Unique('uq_template_step_assignee_user', [
  'processTemplateStepId',
  'tenantUserId',
])
export class ProcessTemplateStepAssigneeEntity {
  @PrimaryGeneratedColumn({
    name: 'step_assignee_id',
    type: 'bigint',
    unsigned: true,
  })
  stepAssigneeId!: number;

  @Column({
    name: 'process_template_step_id',
    type: 'bigint',
    unsigned: true,
  })
  processTemplateStepId!: number;

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

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
  })
  createdBy!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @ManyToOne(() => ProcessTemplateStepEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'process_template_step_id' })
  processTemplateStep?: ProcessTemplateStepEntity;
}
