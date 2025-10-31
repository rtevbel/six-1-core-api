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
import { ProcessInstanceStepEntity } from '../../entities/process_instance_step.entity';
import { ProcessTemplateStepRequirementEntity } from '../../../../process_templates/process_template_steps/process_template_step_requirements/entities/process_template_step_requirement.entity';
import { ProcessInstanceStepRequirementSubmissionEntity } from '../../process_instance_step_requirement_submissions/entities/process_instance_step_requirement_submission.entity';

/**
 * Entity class for `process_instance_step_requirements` table.
 */
@Entity('process_instance_step_requirements')
export class ProcessInstanceStepRequirementEntity {
  @PrimaryGeneratedColumn({
    name: 'requirement_instance_id',
    type: 'bigint',
    unsigned: true,
  })
  requirementInstanceId!: number;

  @Column({
    name: 'step_instance_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Links to process_instance_steps',
  })
  stepInstanceId!: number;

  @Column({
    name: 'process_template_step_requirement_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Links to process_template_step_requirements',
  })
  processTemplateStepRequirementId!: number;

  @Column({
    name: 'requirement_type',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Type of the requirement (e.g., document, approval, etc.)',
  })
  requirementType!: string;

  @Column({
    name: 'requirement_key',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Unique key for the requirement',
  })
  requirementKey!: string;

  @Column({
    name: 'json_schema',
    type: 'json',
    nullable: false,
    comment: 'Frozen copy of the JSON schema for validation',
  })
  jsonSchema!: object;

  @Column({
    name: 'is_mandatory',
    type: 'tinyint',
    width: 1,
    nullable: false,
    default: () => '1',
    comment: 'Indicates if the requirement is mandatory',
  })
  isMandatory!: boolean;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none',
    comment: 'Status of the requirement',
  })
  status!: 'none' | 'pending' | 'approved' | 'rejected';

  @Column({
    name: 'last_submission_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Links to the last submission ID',
  })
  lastSubmissionId!: number | null;

  @Column({
    name: 'approved_at',
    type: 'datetime',
    nullable: true,
    comment: 'Timestamp when the requirement was approved',
  })
  approvedAt!: Date | null;

  @Column({
    name: 'evaluated_at',
    type: 'datetime',
    nullable: true,
    comment: 'Timestamp when the requirement was last evaluated',
  })
  evaluatedAt!: Date | null;

  /**
   * Relationship to ProcessInstanceStepEntity.
   * A requirement belongs to one process instance step.
   */
  @ManyToOne(() => ProcessInstanceStepEntity, (step) => step.requirements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'step_instance_id' })
  processInstanceStep!: ProcessInstanceStepEntity;

  /**
   * Relationship to ProcessTemplateStepRequirementEntity.
   * A requirement is linked to a process template step requirement.
   */
  @ManyToOne(
    () => ProcessTemplateStepRequirementEntity,
    (templateRequirement) => templateRequirement.requirements,
    {
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'process_template_step_requirement_id' })
  processTemplateStepRequirement!: ProcessTemplateStepRequirementEntity;

  /**
   * Relationship to ProcessInstanceStepRequirementSubmissionEntity.
   * A requirement can have multiple submissions.
   */
  @OneToMany(
    () => ProcessInstanceStepRequirementSubmissionEntity,
    (submission) => submission.processInstanceStepRequirement,
  )
  submissions!: ProcessInstanceStepRequirementSubmissionEntity[];
}
