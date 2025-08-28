import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { ProcessTemplateEntity } from './process_template.entity';
import { CategoryEntity } from '../../categories/entities/category.entity';

/**
 * Entity class for `process_template_categories` table.
 *
 * Represents the relationship between process templates and categories.
 */
@Entity('process_template_categories')
export class ProcessTemplateCategoryEntity {
  /**
   * Primary key: Identifier for the associated process template.
   */
  @PrimaryColumn({
    name: 'process_template_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked template',
  })
  processTemplateId!: number;

  /**
   * Primary key: Identifier for the associated category.
   */
  @PrimaryColumn({
    name: 'category_id',
    type: 'int',
    unsigned: true,
    nullable: false,
    comment: 'Linked category',
  })
  categoryId!: number;

  /**
   * Many-to-one relationship with the `ProcessTemplateEntity`.
   *
   * Represents the process template associated with the category.
   */
  @ManyToOne(
    () => ProcessTemplateEntity,
    (processTemplate) => processTemplate.categories,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'process_template_id' })
  processTemplate!: ProcessTemplateEntity;

  /**
   * Many-to-one relationship with the `CategoryEntity`.
   *
   * Represents the category associated with the process template.
   */
  @ManyToOne(() => CategoryEntity, (category) => category.processTemplates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category!: CategoryEntity;
}
