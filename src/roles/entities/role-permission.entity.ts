import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { PermissionEntity } from '../../permissions/entities/permission.entity';
import { RoleEntity } from './role.entity';

/**
 * Entity class for `role_permissions` table.
 *
 * Represents the relationship between roles and permissions.
 */
@Entity('role_permissions')
export class RolePermissionEntity {
  /**
   * Primary key for the role permission.
   *
   * - Auto-incremented integer.
   * - Unsigned.
   *
   * @type {number}
   */
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  role_permission_id!: number;

  /**
   * Foreign key referencing the `roles` table.
   *
   * - Unsigned integer.
   * - Indexed for faster lookups.
   *
   * @type {number}
   */
  @Column({ type: 'int', unsigned: true, nullable: false })
  @Index('role_permissions_role_id')
  role_id!: number;

  /**
   * Foreign key referencing the `permissions` table.
   *
   * - Unsigned integer.
   * - Indexed for faster lookups.
   *
   * @type {number}
   */
  @Column({ type: 'int', unsigned: true, nullable: false })
  @Index('role_permissions_permission_id')
  permission_id!: number;

  /**
   * Timestamp when the role permission was created.
   *
   * - Defaults to the current timestamp.
   *
   * @type {Date}
   */
  @CreateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created_at!: Date;

  /**
   * Many-to-one relationship with the `RoleEntity`.
   *
   * - Cascade operations.
   * - Deletes child rows when parent is deleted.
   *
   * @type {RoleEntity}
   */
  @ManyToOne(() => RoleEntity, (role) => role.permissions, {
    onDelete: 'CASCADE',
  })
  role!: RoleEntity;

  /**
   * Many-to-one relationship with the `PermissionEntity`.
   *
   * - Cascade operations.
   * - Deletes child rows when parent is deleted.
   *
   * @type {PermissionEntity}
   */
  @ManyToOne(
    () => PermissionEntity,
    (permission) => permission.rolePermissions,
    {
      onDelete: 'CASCADE',
    },
  )
  permission!: PermissionEntity;
}
