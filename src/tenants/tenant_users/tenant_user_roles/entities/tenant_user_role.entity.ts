import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantUsersEntity } from '../../entities/tenant_user.entity';
import { RoleEntity } from '../../../../roles/entities/role.entity';

/**
 * Entity class for `tenant_user_roles` table.
 *
 * Represents the roles assigned to tenant users.
 */
@Entity('tenant_user_roles')
export class TenantUserRoleEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_user_role_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantUserRoleId!: number;

  @Column({
    name: 'tenant_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant user',
  })
  @Index('user_roles_user_id')
  tenantUserId!: number;

  @Column({
    name: 'role_id',
    type: 'int',
    unsigned: true,
    nullable: false,
    comment: 'Linked role',
  })
  @Index('user_roles_role_id')
  roleId!: number;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Tenant User ID who assigned role',
  })
  createdBy!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  /**
   * Relationship to TenantUsersEntity.
   * A tenant user role belongs to one tenant user.
   */
  @ManyToOne(() => TenantUsersEntity, (tenantUser) => tenantUser.roles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_user_id' })
  tenantUser!: TenantUsersEntity;

  /**
   * Relationship to RoleEntity.
   * A tenant user role is linked to one role.
   */
  @ManyToOne(() => RoleEntity, (role) => role.userRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;

  /**
   * Relationship to TenantUserEntity for createdBy.
   * Indicates the tenant user who assigned the role.
   */
  @ManyToOne(() => TenantUsersEntity, (tenantUser) => tenantUser.assignedRoles)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;
}
