import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ProcessTemplateEntity } from './process_template.entity';
import { SystemLanguageEntity } from '../../settings/system_languages/entities/system-language.entity';

/**
 * Entity representing the process_template_descriptions table.
 */
@Entity('process_template_descriptions')
export class ProcessTemplateDescriptionEntity {
  /**
   * Primary key: Unique identifier for the process template description.
   */
  @PrimaryGeneratedColumn({
    name: 'process_template_description_id',
    type: 'bigint',
    unsigned: true,
  })
  processTemplateDescriptionId!: number;

  /**
   * Foreign key: Identifier for the associated process template.
   * Defaults to 0.
   */
  @Column({
    name: 'process_template_id',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: 'Process template id who owns this description',
  })
  processTemplateId!: number;

  /**
   * Foreign key: Identifier for the associated language.
   * Defaults to 1.
   */
  @Column({
    name: 'language_id',
    type: 'tinyint',
    unsigned: true,
    default: 1,
  })
  languageId!: number;

  /**
   * Name of the process template description.
   * Cannot exceed 255 characters.
   */
  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Example: HVAC Installation, IT Project Setup',
  })
  name!: string;

  /**
   * Detailed description of the process template.
   * Optional field.
   */
  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
    comment: 'Description of the process',
  })
  description?: string;

  /**
   * Timestamp when the record was created.
   * Automatically set to the current timestamp.
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  /**
   * Relation to the ProcessTemplateEntity.
   * Establishes a many-to-one relationship with the process_templates table.
   */
  @ManyToOne(
    () => ProcessTemplateEntity,
    (processTemplate) => processTemplate.descriptions,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'process_template_id' })
  processTemplate!: ProcessTemplateEntity;

  /**
   * Relation to the SystemLanguageEntity.
   * Establishes a many-to-one relationship with the system_languages table.
   */
  @ManyToOne(
    () => SystemLanguageEntity,
    (language) => language.processTemplateDescriptions,
  )
  @JoinColumn({ name: 'language_id' })
  language!: SystemLanguageEntity;
}
