import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PermissionEntity } from './permission.entity';

/**
 * Entity class for `permission_descriptions` table.
 *
 * Represents the descriptions of permissions in the system.
 */
@Entity('permission_descriptions')
export class PermissionDescriptionEntity {
  @PrimaryGeneratedColumn({
    name: 'permission_description_id',
    type: 'int',
    unsigned: true,
  })
  permissionDescriptionId!: number;

  @Column({
    name: 'permission_id',
    type: 'int',
    unsigned: true,
    nullable: false,
  })
  @Index('permission_descriptions_permission_id')
  permissionId!: number;

  @Column({
    name: 'language_id',
    type: 'tinyint',
    unsigned: true,
    nullable: false,
    default: 1,
  })
  @Index('permission_descriptions_language_id')
  languageId!: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 100,
    nullable: false,
    unique: true,
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    name: 'permission_group',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  permissionGroup?: string;

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
   * Many-to-one relationship with `PermissionEntity`.
   *
   * Represents the permission associated with the description.
   */
  @ManyToOne(() => PermissionEntity, (permission) => permission.descriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permission_id' })
  permission!: PermissionEntity;
}
