import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { RoleEntity } from './role.entity';
import { SystemLanguageEntity } from '../../settings/system_languages/entities/system-language.entity';

/**
 * Entity representing the role_descriptions table.
 */
@Entity('role_descriptions')
export class RoleDescriptionEntity {
  /**
   * Primary key: Unique identifier for the role description.
   */
  @PrimaryGeneratedColumn({
    name: 'role_description_id',
    type: 'int',
    unsigned: true,
  })
  roleDescriptionId!: number;

  /**
   * Foreign key: Identifier for the associated role.
   */
  @Column({ name: 'role_id', type: 'int', unsigned: true })
  roleId!: number;

  /**
   * Foreign key: Identifier for the associated language.
   * Defaults to 1.
   */
  @Column({ name: 'language_id', type: 'tinyint', unsigned: true, default: 1 })
  languageId!: number;

  /**
   * Name of the role description.
   * Must be unique and cannot exceed 50 characters.
   */
  @Column({ name: 'name', type: 'varchar', length: 50, unique: true })
  name!: string;

  /**
   * Detailed description of the role.
   * Optional field.
   */
  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  /**
   * Timestamp when the record was created.
   * Automatically set to the current timestamp.
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  /**
   * Timestamp when the record was last updated.
   * Automatically updated to the current timestamp on modification.
   */
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;

  /**
   * Relation to the RoleEntity.
   * Establishes a many-to-one relationship with the roles table.
   */
  @ManyToOne(() => RoleEntity, (role) => role.descriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;

  /**
   * Relation to the SystemLanguageEntity.
   * Establishes a many-to-one relationship with the system_languages table.
   */
  @ManyToOne(
    () => SystemLanguageEntity,
    (language) => language.roleDescriptions,
  )
  @JoinColumn({ name: 'language_id' })
  language!: SystemLanguageEntity;
}
