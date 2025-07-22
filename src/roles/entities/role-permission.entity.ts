import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
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
  @PrimaryGeneratedColumn({
    name: 'role_permission_id',
    type: 'int',
    unsigned: true,
  })
  rolePermissionId!: number;

  @Column({ name: 'role_id', type: 'int', unsigned: true, nullable: false })
  @Index('role_permissions_role_id')
  roleId!: number;

  @Column({
    name: 'permission_id',
    type: 'int',
    unsigned: true,
    nullable: false,
  })
  @Index('role_permissions_permission_id')
  permissionId!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  /**
   * Many-to-one relationship with the `RoleEntity`.
   *
   * Represents the role associated with the permission.
   */
  @ManyToOne(() => RoleEntity, (role) => role.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;

  /**
   * Many-to-one relationship with the `PermissionEntity`.
   *
   * Represents the permission associated with the role.
   */
  @ManyToOne(
    () => PermissionEntity,
    (permission) => permission.rolePermissions,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'permission_id' })
  permission!: PermissionEntity;
}
