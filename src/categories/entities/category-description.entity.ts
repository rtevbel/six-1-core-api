import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { CategoryEntity } from './category.entity';
import { SystemLanguageEntity } from '../../settings/system_languages/entities/system-language.entity';

/**
 * Entity representing the category_descriptions table.
 */
@Entity('category_descriptions')
export class CategoryDescriptionEntity {
  /**
   * Primary key: Unique identifier for the category description.
   */
  @PrimaryGeneratedColumn({
    name: 'category_description_id',
    type: 'bigint',
    unsigned: true,
  })
  categoryDescriptionId!: number;

  /**
   * Foreign key: Identifier for the associated category.
   * Defaults to 0.
   */
  @Column({
    name: 'category_id',
    type: 'int',
    unsigned: true,
    default: 0,
    comment: 'Category id who owns this description',
  })
  categoryId!: number;

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
   * Name of the category description.
   * Must be unique and cannot exceed 255 characters.
   */
  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'Name of the category',
  })
  name!: string;

  /**
   * Detailed description of the category.
   * Optional field.
   */
  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
    comment: 'Description of the category',
  })
  description?: string;

  /**
   * Timestamp when the record was created.
   * Automatically set to the current timestamp.
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  /**
   * Relation to the CategoryEntity.
   * Establishes a many-to-one relationship with the categories table.
   */
  @ManyToOne(() => CategoryEntity, (category) => category.descriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category!: CategoryEntity;

  /**
   * Relation to the SystemLanguageEntity.
   * Establishes a many-to-one relationship with the system_languages table.
   */
  @ManyToOne(
    () => SystemLanguageEntity,
    (language) => language.categoryDescriptions,
  )
  @JoinColumn({ name: 'language_id' })
  language!: SystemLanguageEntity;
}
