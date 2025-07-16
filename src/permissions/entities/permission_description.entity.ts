import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { PermissionEntity } from './permission.entity';

/**
 * Entity class for `permission_descriptions` table.
 *
 * Represents the descriptions of permissions in the system.
 */
@Entity('permission_descriptions')
export class PermissionDescriptionEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  permission_description_id!: number;

  @Column({
    type: 'int',
    unsigned: true,
    nullable: false,
  })
  @Index('permission_descriptions_permission_id')
  permission_id!: number;

  @Column({
    type: 'tinyint',
    unsigned: true,
    nullable: false,
    default: 1,
  })
  @Index('permission_descriptions_language_id')
  language_id!: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    unique: true,
  })
  name!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  permission_group?: string;

  @CreateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;

  /**
   * Many-to-one relationship with `PermissionEntity`.
   *
   * Represents the permission associated with the description.
   */
  @ManyToOne(() => PermissionEntity, (permission) => permission.descriptions, {
    onDelete: 'CASCADE',
  })
  permission!: PermissionEntity;
}
