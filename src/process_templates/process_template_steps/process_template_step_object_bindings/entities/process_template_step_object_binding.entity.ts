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
import { ConfigObjectEntity } from '../../../../config_objects/entities/config_object.entity';
import { TenantUsersEntity } from '../../../../tenants/tenant_users/entities/tenant_user.entity';
import type { ProcessTemplateObjectBindingMode } from '../../../../automation/process-step-object-binding.constants';
import { ProcessInstanceStepObjectInstanceEntity } from '../../../../process_instances/process_instance_steps/process_instance_step_object_instances/entities/process_instance_step_object_instance.entity';

@Entity('process_template_step_object_bindings')
export class ProcessTemplateStepObjectBindingEntity {
  @PrimaryGeneratedColumn({
    name: 'binding_id',
    type: 'bigint',
    unsigned: true,
  })
  bindingId!: number;

  @Column({
    name: 'process_template_step_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  processTemplateStepId!: number;

  @Column({
    name: 'config_object_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  configObjectId!: number;

  @Column({
    name: 'binding_mode',
    type: 'enum',
    enum: ['create_on_enter', 'use_existing'],
    default: 'create_on_enter',
  })
  bindingMode!: ProcessTemplateObjectBindingMode;

  @Column({
    name: 'instance_label_template',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  instanceLabelTemplate!: string | null;

  @Column({
    name: 'is_mandatory',
    type: 'tinyint',
    default: 1,
  })
  isMandatory!: boolean;

  @Column({
    name: 'completion_rule',
    type: 'json',
    nullable: false,
  })
  completionRule!: Record<string, unknown>;

  @Column({
    name: 'order_index',
    type: 'int',
    default: 0,
  })
  orderIndex!: number;

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

  @ManyToOne(() => ProcessTemplateStepEntity, (step) => step.objectBindings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'process_template_step_id' })
  processTemplateStep!: ProcessTemplateStepEntity;

  @ManyToOne(() => ConfigObjectEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'config_object_id' })
  configObject!: ConfigObjectEntity;

  @ManyToOne(() => TenantUsersEntity)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  @ManyToOne(() => TenantUsersEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: TenantUsersEntity;

  @OneToMany(
    () => ProcessInstanceStepObjectInstanceEntity,
    (row) => row.templateBinding,
  )
  instanceRows!: ProcessInstanceStepObjectInstanceEntity[];
}
