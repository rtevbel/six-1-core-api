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
import { ProcessTemplateEntity } from '../../entities/process_template.entity';
import { TenantUsersEntity } from '../../../tenants/tenant_users/entities/tenant_user.entity';
import { ProcessTemplateStepDescriptionEntity } from './process_template_step_description.entity';
import { ProcessTemplateStepRequirementEntity } from '../process_template_step_requirements/entities/process_template_step_requirement.entity';
import { TaskEntity } from '../../../projects/tasks/entities/task.entity';

/**
 * Entity class for `process_template_steps` table.
 */
@Entity('process_template_steps')
export class ProcessTemplateStepEntity {
  @PrimaryGeneratedColumn({
    name: 'process_template_step_id',
    type: 'bigint',
    unsigned: true,
  })
  processTemplateStepId!: number;

  @Column({
    name: 'process_template_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Links to process_templates',
  })
  processTemplateId!: number;

  @Column({
    name: 'task_type',
    type: 'enum',
    enum: ['manual', 'automated'],
    default: 'manual',
    comment: 'Manual or Auto step',
  })
  taskType!: 'manual' | 'automated';

  @Column({
    name: 'step_order',
    type: 'int',
    nullable: false,
    comment: 'Defines the order of steps in the process',
  })
  stepOrder!: number;

  @Column({
    name: 'is_optional',
    type: 'tinyint',
    default: 0,
  })
  isOptional!: boolean;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Tenant User ID',
  })
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    default: 0,
    nullable: true,
    comment: 'Tenant User ID',
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
   * Relationship to ProcessTemplateEntity.
   * A step belongs to one process template.
   */
  @ManyToOne(
    () => ProcessTemplateEntity,
    (processTemplate) => processTemplate.steps,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'process_template_id' })
  processTemplate!: ProcessTemplateEntity;

  /**
   * Relationship to TenantUsersEntity for createdBy.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdSteps)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for updatedBy.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.updatedSteps, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: TenantUsersEntity;

  /**
   * Relationship to ProcessTemplateStepDescriptionEntity.
   * A step can have multiple descriptions.
   */
  @OneToMany(
    () => ProcessTemplateStepDescriptionEntity,
    (description) => description.processTemplateStep,
    {
      cascade: true,
    },
  )
  descriptions!: ProcessTemplateStepDescriptionEntity[];

  /**
   * Relationship to ProcessTemplateStepRequirementEntity.
   * A step can have multiple requirements.
   */
  @OneToMany(
    () => ProcessTemplateStepRequirementEntity,
    (requirement) => requirement.processTemplateStep,
    {
      cascade: true,
    },
  )
  requirements!: ProcessTemplateStepRequirementEntity[];

  /**
   * Relationship to TaskEntity.
   * A process template step can be linked to multiple tasks.
   */
  @OneToMany(() => TaskEntity, (task) => task.processTemplateStep)
  tasks!: TaskEntity[];
}
