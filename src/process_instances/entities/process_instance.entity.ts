import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne
} from 'typeorm';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { ProcessTemplateEntity } from '../../process_templates/entities/process_template.entity';
import {ProcessInstanceStepEntity} from "../process_instance_steps/entities/process_instance_step.entity";
import { ProjectEntity } from '../../projects/entities/project.entity';

/**
 * Entity class for `process_instances` table.
 *
 * Represents the process instances in the system.
 */
@Entity('process_instances')
export class ProcessInstanceEntity {
  @PrimaryGeneratedColumn({
    name: 'process_instance_id',
    type: 'bigint',
    unsigned: true,
  })
  processInstanceId!: number;

  @Column({
    name: 'process_template_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  processTemplateId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  tenantId!: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['draft', 'active', 'completed', 'canceled'],
    default: 'active',
  })
  status!: 'draft' | 'active' | 'completed' | 'canceled';

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  createdBy!: number;

  @CreateDateColumn({
    name: 'started_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  startedAt!: Date;

  @Column({
    name: 'completed_at',
    type: 'datetime',
    nullable: true,
  })
  completedAt!: Date | null;

  @Column({
    name: 'canceled_at',
    type: 'datetime',
    nullable: true,
  })
  canceledAt!: Date | null;

  @Column({
    name: 'correlation_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  correlationId!: string | null;

  /**
   * Relationship to ProcessTemplateEntity.
   * A process instance is based on one process template.
   */
  @ManyToOne(() => ProcessTemplateEntity, (template) => template.processInstances, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'process_template_id' })
  processTemplate!: ProcessTemplateEntity;

  /**
   * Relationship to TenantEntity.
   * A process instance belongs to one tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.processInstances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  /**
   * Relationship to TenantUsersEntity.
   * A process instance is created by one tenant user.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdProcessInstances)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

 /**
   * Reverse relationship to ProcessInstanceStepEntity.
   * A process instance can have multiple steps.
   */
 @OneToMany(
  () => ProcessInstanceStepEntity,
  (processInstanceStep) => processInstanceStep.processInstance,
 )
 steps!: ProcessInstanceStepEntity[];

  /**
   * One-to-many relationship with the `ProjectEntity`.
   * A process instance can have multiple projects linked to it.
   */
  @OneToMany(
    () => ProjectEntity,
    (project) => project.processInstance,
  )
  projects?: ProjectEntity[];
  
  /**
   * One-to-one Relationship to ProcessTemplateEntity.
   * A process instance can be linked to one process template.
   */
  
  @OneToOne(
    () => ProcessTemplateEntity,
    (processTemplate) => processTemplate.processInstances,
  )
  @JoinColumn({ name: 'process_template_id' })
  processTemplates?: ProcessTemplateEntity[];

}