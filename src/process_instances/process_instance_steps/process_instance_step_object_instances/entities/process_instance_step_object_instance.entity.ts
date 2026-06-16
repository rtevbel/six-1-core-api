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
import { ProcessTemplateStepObjectBindingEntity } from '../../../../process_templates/process_template_steps/process_template_step_object_bindings/entities/process_template_step_object_binding.entity';
import { ConfigObjectEntity } from '../../../../config_objects/entities/config_object.entity';
import { ConfigCustomObjectInstanceEntity } from '../../../../config_objects/entities/config_custom_object_instance.entity';
import type { ProcessInstanceStepObjectStatus } from '../../../../automation/process-step-object-binding.constants';

@Entity('process_instance_step_object_instances')
export class ProcessInstanceStepObjectInstanceEntity {
  @PrimaryGeneratedColumn({
    name: 'step_object_instance_id',
    type: 'bigint',
    unsigned: true,
  })
  stepObjectInstanceId!: number;

  @Column({
    name: 'step_instance_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  stepInstanceId!: number;

  @Column({
    name: 'binding_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  bindingId!: number | null;

  @Column({
    name: 'config_object_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  configObjectId!: number;

  @Column({
    name: 'config_custom_object_instance_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  configCustomObjectInstanceId!: number | null;

  @Column({
    name: 'core_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  coreId!: number | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['pending', 'active', 'valid', 'failed', 'skipped'],
    default: 'pending',
  })
  status!: ProcessInstanceStepObjectStatus;

  @Column({
    name: 'last_error',
    type: 'text',
    nullable: true,
  })
  lastError!: string | null;

  @Column({
    name: 'payload_snapshot',
    type: 'json',
    nullable: true,
  })
  payloadSnapshot!: Record<string, unknown> | null;

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

  @ManyToOne(() => ProcessInstanceStepEntity, (step) => step.objectInstances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'step_instance_id' })
  processInstanceStep!: ProcessInstanceStepEntity;

  @ManyToOne(
    () => ProcessTemplateStepObjectBindingEntity,
    (binding) => binding.instanceRows,
    { onDelete: 'SET NULL', nullable: true },
  )
  @JoinColumn({ name: 'binding_id' })
  templateBinding!: ProcessTemplateStepObjectBindingEntity | null;

  @ManyToOne(() => ConfigObjectEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'config_object_id' })
  configObject!: ConfigObjectEntity;

  @ManyToOne(() => ConfigCustomObjectInstanceEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'config_custom_object_instance_id' })
  configCustomObjectInstance!: ConfigCustomObjectInstanceEntity | null;
}
