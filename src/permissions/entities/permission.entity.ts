import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PermissionDescriptionEntity } from './permission_description.entity';
import { RolePermissionEntity } from '../../roles/entities/role-permission.entity';

/**
 * Entity class for `permissions` table.
 *
 * @Version 0.0.1
 *
 * Represents the permissions in the system.
 */
@Entity('permissions')
export class PermissionEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  permission_id!: number;

  @Column({
    type: 'tinyint',
    unsigned: true,
    nullable: false,
    default: 1,
  })
  @Index('permissions_status_id')
  status_id!: number;

  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: false,
    default: 0,
  })
  @Index('permissions_created_by')
  created_by!: number;

  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: true,
    default: 0,
  })
  @Index('permissions_updated_by')
  updated_by!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created_at!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updated_at!: Date;

  /**
   * One-to-many relationship with `PermissionDescriptionEntity`.
   *
   * Represents the descriptions associated with the permission.
   */
  @OneToMany(
    () => PermissionDescriptionEntity,
    (description) => description.permission,
    {
      cascade: true,
      onDelete: 'CASCADE',
      orphanedRowAction: 'delete',
      eager: true,
    },
  )
  @JoinColumn({ name: 'permission_id' }) // Join column for descriptions
  descriptions!: PermissionDescriptionEntity[];

  /**
   * One-to-many relationship with the `RolePermissionEntity`.
   *
   * - Establishes the inverse side of the relationship.
   * - Allows access to all role permissions associated with a permission.
   *
   * @type {RolePermissionEntity[]}
   */
  @OneToMany(
    () => RolePermissionEntity,
    (rolePermission) => rolePermission.permission,
  )
  @JoinColumn({ name: 'permission_id' }) // Join column for role permissions
  rolePermissions!: RolePermissionEntity[];
}
