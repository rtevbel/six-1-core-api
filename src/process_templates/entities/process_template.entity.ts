import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { ProcessTemplateDescriptionEntity } from './process_template_description.entity';
import { ProcessTemplateCategoryEntity } from './process_template_category.entity';
import { ProcessTemplateStepEntity } from '../process_template_steps/entities/process_template_step.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { ProcessInstanceEntity } from '../../process_instances/entities/process_instance.entity';

/**
 * Entity class for `process_templates` table.
 *
 * Represents the process templates in the system.
 */
@Entity('process_templates')
export class ProcessTemplateEntity {
  @PrimaryGeneratedColumn({
    name: 'process_template_id',
    type: 'bigint',
    unsigned: true,
  })
  processTemplateId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: 'Who owns this process_template?',
  })
  tenantId!: number;

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
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;

  /**
   * Relationship to TenantEntity.
   * A process template belongs to one tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.processTemplates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  /**
   * Relationship to TenantUsersEntity for createdBy.
   * A process template is created by one tenant user.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdProcessTemplates)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for updatedBy.
   * A process template is updated by one tenant user.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.updatedProcessTemplates, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: TenantUsersEntity;

  /**
   * Relationship to ProcessTemplateDescriptionEntity.
   * A process template can have multiple descriptions.
   */
  @OneToMany(
    () => ProcessTemplateDescriptionEntity,
    (description) => description.processTemplate,
    {
      cascade: true,
    },
  )
  descriptions!: ProcessTemplateDescriptionEntity[];

  /**
   * Relationship to ProcessTemplateCategoryEntity.
   * A process template can be associated with multiple categories.
   */
  @OneToMany(
    () => ProcessTemplateCategoryEntity,
    (processTemplateCategory) => processTemplateCategory.processTemplate,
    {
      cascade: true,
    },
  )
  categories!: ProcessTemplateCategoryEntity[];

  /**
   * Relationship to ProcessTemplateStepEntity.
   * A process template can have multiple steps.
   */
  @OneToMany(() => ProcessTemplateStepEntity, (step) => step.processTemplate, {
    cascade: true,
  })
  steps!: ProcessTemplateStepEntity[];

  /**
   * Relationship to ProcessInstanceEntity.
   * A process template can have multiple process instances.
   */
  @OneToMany(
    () => ProcessInstanceEntity,
    (processInstance) => processInstance.processTemplate,
    {
      cascade: true,
    },
  )
  processInstances!: ProcessInstanceEntity[];
}
