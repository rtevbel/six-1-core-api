import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { SystemStatusEntity } from '../../settings/system_statuses/entities/system-status.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { CategoryDescriptionEntity } from './category-description.entity';
import { ProcessTemplateCategoryEntity } from '../../process_templates/entities/process_template_category.entity';

/**
 * Entity class for `categories` table.
 *
 * Represents the categories in the system.
 */
@Entity('categories')
export class CategoryEntity {
  @PrimaryGeneratedColumn({
    name: 'category_id',
    type: 'int',
    unsigned: true,
  })
  categoryId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: 'Linked tenant',
  })
  @Index('categories_tenant_id')
  tenantId!: number;

  @Column({
    name: 'status_id',
    type: 'tinyint',
    unsigned: true,
    nullable: false,
  })
  @Index('categories_status_id')
  statusId!: number;

  @Column({
    name: 'group_name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  groupName!: string;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Tenant-user who created the team',
  })
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    default: 0,
    nullable: true,
    comment: 'Tenant-user who updated the team',
  })
  updatedBy!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;

  /**
   * Many-to-one relationship with `TenantEntity`.
   *
   * Represents the tenant associated with the category.
   * Allows `tenant_id` to be zero or null.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.categories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  /**
   * Many-to-one relationship with `SystemStatusEntity`.
   *
   * Represents the status associated with the category.
   */
  @ManyToOne(() => SystemStatusEntity, (status) => status.categories)
  @JoinColumn({ name: 'status_id' })
  status!: SystemStatusEntity;

  /**
   * Many-to-one relationship with `TenantUsersEntity` for `created_by`.
   *
   * Represents the tenant user who created the category.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdCategories)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Many-to-one relationship with `TenantUsersEntity` for `updated_by`.
   *
   * Represents the tenant user who last updated the category.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.updatedCategories, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: TenantUsersEntity;

  /**
   * One-to-many relationship with `CategoryDescriptionEntity`.
   *
   * Represents the descriptions associated with the category.
   */
  @OneToMany(
    () => CategoryDescriptionEntity,
    (description) => description.category,
    {
      cascade: true,
      onDelete: 'CASCADE',
    },
  )
  descriptions!: CategoryDescriptionEntity[];

  /**
   * Relationship to ProcessTemplateCategoryEntity.
   * A category can be associated with multiple process templates.
   */
  @OneToMany(
    () => ProcessTemplateCategoryEntity,
    (processTemplateCategory) => processTemplateCategory.category,
    {
      cascade: true,
    },
  )
  processTemplates!: ProcessTemplateCategoryEntity[];
}
