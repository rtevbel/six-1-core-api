import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ProcessTemplateStepEntity } from './process_template_step.entity';
import { SystemLanguageEntity } from '../../../settings/system_languages/entities/system-language.entity';

/**
 * Entity class for `process_template_step_descriptions` table.
 */
@Entity('process_template_step_descriptions')
export class ProcessTemplateStepDescriptionEntity {
  @PrimaryGeneratedColumn({
    name: 'process_template_step_description_id',
    type: 'bigint',
    unsigned: true,
  })
  processTemplateStepDescriptionId!: number;

  @Column({
    name: 'process_template_step_id',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: 'Process template step ID who owns this description',
  })
  processTemplateStepId!: number;

  @Column({
    name: 'language_id',
    type: 'tinyint',
    unsigned: true,
    default: 1,
  })
  languageId!: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Step Name (e.g., "Install Wires", "Test Server")',
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
    comment: 'Step details',
  })
  description?: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  /**
   * Relationship to ProcessTemplateStepEntity.
   * A description belongs to one process template step.
   */
  @ManyToOne(
    () => ProcessTemplateStepEntity,
    (processTemplateStep) => processTemplateStep.descriptions,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'process_template_step_id' })
  processTemplateStep!: ProcessTemplateStepEntity;

  /**
   * Relationship to SystemLanguageEntity.
   * A description is written in one language.
   */
  @ManyToOne(
    () => SystemLanguageEntity,
    (language) => language.processTemplateStepDescriptions,
  )
  @JoinColumn({ name: 'language_id' })
  language!: SystemLanguageEntity;
}
