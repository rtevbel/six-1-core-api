import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProcessTemplateStepTriggerConditionEntity } from '../../process_template_step_trigger_conditions/entities/process_template_step_trigger_condition.entity';
import { TenantUsersEntity } from '../../../../tenants/tenant_users/entities/tenant_user.entity';

/**
 * Entity class for `process_template_step_trigger_condition_submissions` table.
 */
@Entity('process_template_step_trigger_condition_submissions')
export class ProcessTemplateStepTriggerConditionSubmissionEntity {
  @PrimaryGeneratedColumn({
    name: 'step_trigger_condition_submission_id',
    type: 'bigint',
    unsigned: true,
  })
  stepTriggerConditionSubmissionId!: number;

  @Column({
    name: 'step_trigger_condition_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Links to process_template_step_trigger_conditions',
  })
  stepTriggerConditionId!: number;

  @Column({
    name: 'submitted_data',
    type: 'json',
    nullable: false,
    comment: 'Stores actual input data',
  })
  submittedData!: object;

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
   * Relationship to ProcessTemplateStepTriggerConditionEntity.
   * A submission belongs to one trigger condition.
   */
  @ManyToOne(
    () => ProcessTemplateStepTriggerConditionEntity,
    (triggerCondition) => triggerCondition.submissions,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'step_trigger_condition_id' })
  stepTriggerCondition!: ProcessTemplateStepTriggerConditionEntity;

  /**
   * Relationship to TenantUsersEntity for createdBy.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdSubmissions)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for reviewedBy.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.reviewedSubmissions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedByUser!: TenantUsersEntity | null;
}
