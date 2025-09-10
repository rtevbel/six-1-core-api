import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantUsersEntity } from '../../../../tenants/tenant_users/entities/tenant_user.entity';
import { ProcessTemplateStepRequirementEntity } from '../../process_template_step_requirements/entities/process_template_step_requirement.entity';

/**
 * Entity class for `process_template_step_requirement_submissions` table.
 *
 * Represents the submissions for process template step requirements.
 */
@Entity('process_template_step_requirement_submissions')
export class ProcessTemplateStepRequirementSubmissionEntity {
  @PrimaryGeneratedColumn({
    name: 'step_requirement_submission_id',
    type: 'bigint',
    unsigned: true,
  })
  stepRequirementSubmissionId!: number;

  @Column({
    name: 'process_template_step_requirement_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Links to process_template_step_requirement',
  })
  processTemplateStepRequirementId!: number;

  @Column({
    name: 'submitted_data',
    type: 'json',
    nullable: false,
    comment: 'Stores actual input data',
  })
  submittedData!: Record<string, any>;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    comment: 'Approval status',
  })
  status!: 'pending' | 'approved' | 'rejected';

  @Column({
    name: 'reviewed_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Tenant User who approved/rejected',
  })
  reviewedBy!: number | null;

  @Column({
    name: 'reviewed_at',
    type: 'datetime',
    nullable: true,
    comment: 'When it was reviewed',
  })
  reviewedAt!: Date | null;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Tenant User ID',
  })
  createdBy!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  /**
   * Relationship to ProcessTemplateStepRequirementEntity.
   * A submission belongs to one process template step requirement.
   */
  @ManyToOne(
    () => ProcessTemplateStepRequirementEntity,
    (requirement) => requirement.submissions,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'process_template_step_requirement_id' })
  processTemplateStepRequirement!: ProcessTemplateStepRequirementEntity;

  /**
   * Relationship to TenantUsersEntity for createdBy.
   * A submission is created by one tenant user.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdSubmissions)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for reviewedBy.
   * A submission is reviewed by one tenant user.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.reviewedSubmissions, {
    nullable: true,
  })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedByUser!: TenantUsersEntity;
}
