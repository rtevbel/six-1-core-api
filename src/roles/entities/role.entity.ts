import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { RolePermissionEntity } from './role-permission.entity';
import { RoleDescriptionEntity } from './role-description.entity';
import { UserRoleEntity } from '../../users/user-roles/entities/user-role.entity';

/**
 * Entity class for `roles` table.
 *
 * Represents the roles in the system.
 */
@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  role_id!: number;

  @Column({
    type: 'tinyint',
    width: 1,
    unsigned: true,
    nullable: false,
    default: 1,
  })
  @Index('roles_is_active')
  is_active: number = 1;

  @Column({
    type: 'tinyint',
    width: 1,
    unsigned: true,
    default: 0,
    nullable: false,
  })
  @Index('roles_is_deleted')
  is_deleted: number = 0;

  @Column({
    type: 'int',
    width: 11,
    unsigned: true,
    default: 0,
    nullable: false,
  })
  @Index('roles_created_by')
  created_by: number = 0;

  @Column({
    type: 'int',
    width: 11,
    unsigned: true,
    default: 0,
    nullable: true,
  })
  @Index('roles_updated_by')
  updated_by: number = 0;

  @CreateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  updated_at!: Date;

  /**
   * One-to-many relationship with `RoleDescriptionEntity`.
   *
   * Represents the descriptions associated with the role.
   */
  @OneToMany(() => RoleDescriptionEntity, (description) => description.role, {
    cascade: true,
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
    eager: true,
  })
  descriptions!: RoleDescriptionEntity[];

  /**
   * One-to-many relationship with `RolePermissionEntity`.
   *
   * Represents the descriptions associated with the role.
   */
  @OneToMany(() => RolePermissionEntity, (permission) => permission.role, {
    cascade: true,
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
    eager: true,
  })
  permissions!: RolePermissionEntity[];

  /**
   * One-to-many relationship with `UserRoleEntity`.
   *
   * Represents the users associated with this role.
   */
  @OneToMany(() => UserRoleEntity, (userRole) => userRole.role, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  user_roles!: UserRoleEntity[];
}
