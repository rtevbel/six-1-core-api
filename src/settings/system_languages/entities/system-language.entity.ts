import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { RoleDescriptionEntity } from '../../../roles/entities/role-description.entity';

/**
 * Entity class for `system_languages` table.
 *
 * Represents the languages in the system.
 */
@Entity('system_languages')
export class SystemLanguageEntity {
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  language_id!: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    unique: true,
    comment: 'Human-readable language name like English, Italian, etc.',
  })
  @Index('system_languages_name')
  name!: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    unique: true,
    comment: 'Language code like en',
  })
  @Index('system_languages_lang_code')
  lang_code!: string;

  @Column({
    type: 'tinyint',
    width: 1,
    unsigned: true,
    default: 1,
    nullable: false,
    comment: 'Indicates whether the language is active',
  })
  is_active: number = 1;

  @CreateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updated_at!: Date;

  /**
   * One-to-many relationship with role descriptions.
   * Establishes a connection to the RoleDescription entity.
   */
  @OneToMany(
    () => RoleDescriptionEntity,
    (roleDescription) => roleDescription.language,
  )
  roleDescriptions!: RoleDescriptionEntity[];
}
