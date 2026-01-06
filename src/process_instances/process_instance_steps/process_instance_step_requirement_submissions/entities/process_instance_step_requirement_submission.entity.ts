import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantUsersEntity } from '../../../../tenants/tenant_users/entities/tenant_user.entity';
import { ProcessInstanceStepRequirementEntity } from '../../process_instance_step_requirements/entities/process_instance_step_requirement.entity';

/**
 * Entity class for `process_instance_requirement_submissions` table.
 *
 * Represents the submissions for process instance step requirements.
 */
@Entity('process_instance_step_requirement_submissions')
export class ProcessInstanceStepRequirementSubmissionEntity {
  @PrimaryGeneratedColumn({
    name: 'requirement_submission_id',
    type: 'bigint',
    unsigned: true,
  })
  requirementSubmissionId!: number;

  @Column({
    name: 'requirement_instance_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Links to process_instance_step_requirements',
  })
  requirementInstanceId!: number;

  @Column({
    name: 'submitted_data',
    type: 'json',
    nullable: false,
    comment: 'Stores actual input data',
  })
  submittedData!: Record<string, any>;

  @Column({
    name: 'is_valid',
    type: 'tinyint',
    width: 1,
    nullable: true,
    comment: 'Indicates if the submission is valid',
  })
  isValid!: boolean | null;

  @Column({
    name: 'validation_errors',
    type: 'json',
    nullable: true,
    comment: 'Stores validation errors, if any',
  })
  validationErrors!: Record<string, any> | null;

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
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  /**
   * Relationship to ProcessInstanceStepRequirementEntity.
   * A submission belongs to one process instance step requirement.
   */
  @ManyToOne(
    () => ProcessInstanceStepRequirementEntity,
    (requirement) => requirement.submissions,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'requirement_instance_id' })
  processInstanceStepRequirement!: ProcessInstanceStepRequirementEntity;

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
