import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { RoleDescriptionEntity } from '../../../roles/entities/role-description.entity';
import { TenantUserConfigurationsEntity } from '../../../tenants/tenant_users/tenant_user_configurations/entities/tenant_user_configuration.entity';
import { CategoryDescriptionEntity } from '../../../categories/entities/category-description.entity';
import { ProcessTemplateDescriptionEntity } from '../../../process_templates/entities/process_template_description.entity';
import { ProcessTemplateStepDescriptionEntity } from '../../../process_templates/process_template_steps/entities/process_template_step_description.entity';

/**
 * Entity class for `system_languages` table.
 *
 * Represents the languages in the system.
 */
@Entity('system_languages')
export class SystemLanguageEntity {
  @PrimaryGeneratedColumn({ name: 'language_id' })
  languageId!: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 20,
    nullable: false,
    unique: true,
    comment: 'Human-readable language name like English, Italian, etc.',
  })
  @Index('system_languages_name')
  name!: string;

  @Column({
    name: 'lang_code',
    type: 'varchar',
    length: 20,
    nullable: false,
    unique: true,
    comment: 'Language code like en',
  })
  @Index('system_languages_lang_code')
  langCode!: string;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    width: 1,
    unsigned: true,
    default: 1,
    nullable: false,
    comment: 'Indicates whether the language is active',
  })
  isActive: number = 1;

  /**
   * One-to-many relationship with role descriptions.
   * Establishes a connection to the RoleDescription entity.
   */
  @OneToMany(
    () => RoleDescriptionEntity,
    (roleDescription) => roleDescription.language,
  )
  roleDescriptions!: RoleDescriptionEntity[];

  /**
   * Relation to the TenantUserConfigurationsEntity.
   * Establishes a one-to-many relationship with the tenant_user_configurations table.
   */
  @OneToMany(
    () => TenantUserConfigurationsEntity,
    (configuration) => configuration.language,
  )
  tenantUserConfigurations!: TenantUserConfigurationsEntity[];

  /**
   * One-to-many relationship with `CategoryDescriptionEntity`.
   *
   * Represents the category descriptions associated with the language.
   */
  @OneToMany(
    () => CategoryDescriptionEntity,
    (description) => description.language,
  )
  categoryDescriptions!: CategoryDescriptionEntity[];

  /**
   * Relationship to ProcessTemplateDescriptionEntity.
   * A system language can be associated with multiple process template descriptions.
   */
  @OneToMany(
    () => ProcessTemplateDescriptionEntity,
    (description) => description.language,
  )
  processTemplateDescriptions!: ProcessTemplateDescriptionEntity[];

  /**
   *Relationship to ProcessTemplateStepDescriptionEntity.
   * A language can have multiple step descriptions.
   */
  @OneToMany(
    () => ProcessTemplateStepDescriptionEntity,
    (description) => description.language,
  )
  processTemplateStepDescriptions!: ProcessTemplateStepDescriptionEntity[];
}
