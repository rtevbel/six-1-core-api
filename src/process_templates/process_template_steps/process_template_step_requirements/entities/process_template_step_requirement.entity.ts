import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany
} from 'typeorm';
import { ProcessTemplateStepEntity } from '../../entities/process_template_step.entity';
import { TenantUsersEntity } from '../../../../tenants/tenant_users/entities/tenant_user.entity';
import { ProcessTemplateStepRequirementSubmissionEntity } from '../../process_template_step_requirement_submissions/entities/process_template_step_requirement_submission.entity';


/**
 * Entity class for `process_template_step_requirements` table.
 */
@Entity('process_template_step_requirements')
export class ProcessTemplateStepRequirementEntity {
  @PrimaryGeneratedColumn({
    name: 'process_template_step_requirement_id',
    type: 'bigint',
    unsigned: true,
  })
  processTemplateStepRequirementId!: number;

  @Column({
    name: 'process_template_step_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Links to process_template_steps',
  })
  processTemplateStepId!: number;

  @Column({
    name: 'requirement_type',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'e.g., document, approval, payment, etc.',
  })
  requirementType!: string;

  @Column({
    name: 'requirement_key',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Example: "firewall_config.json", "IT Manager Approval"',
  })
  requirementKey!: string;

  @Column({
    name: 'json_schema',
    type: 'json',
    nullable: false,
    comment: 'Stores validation and events schema for this requirement',
  })
  jsonSchema!: object;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'User ID from tenant_users table',
  })
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    default: 0,
    nullable: true,
    comment: 'User ID from tenant_users table',
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
   * Relationship to ProcessTemplateStepEntity.
   * A requirement belongs to one process template step.
   */
  @ManyToOne(() => ProcessTemplateStepEntity, (step) => step.requirements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'process_template_step_id' })
  processTemplateStep!: ProcessTemplateStepEntity;

  /**
   * Relationship to TenantUsersEntity for createdBy.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdRequirements)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for updatedBy.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.updatedRequirements, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: TenantUsersEntity;

  /**
   * Relationship to ProcessTemplateStepRequirementSubmissionEntity.
   * A process template step requirement can have multiple submissions.
   */
  @OneToMany(
    () => ProcessTemplateStepRequirementSubmissionEntity,
    (submission) => submission.processTemplateStepRequirement,
    {
      cascade: true,
    },
  )
  submissions!: ProcessTemplateStepRequirementSubmissionEntity[];
}
