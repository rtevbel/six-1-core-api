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
import { TenantUserInvitationsEntity } from '../../tenants/tenant_users/tenant_user_invitations/entities/tenant_user_invitation.entity';
import { TenantTeamMemberEntity } from '../../tenants/tenant_teams/tenant_team_members/entities/tenant_team_member.entity';

/**
 * Entity class for `roles` table.
 *
 * Represents the roles in the system.
 */
@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn({ name: 'role_id', type: 'int', unsigned: true })
  roleId!: number;

  @Column({
    name: 'status_id',
    type: 'tinyint',
    unsigned: true,
    default: 1,
    comment: '1,2',
  })
  @Index('roles_status_id')
  statusId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: 'Linked tenant',
  })
  tenantId!: number;

  @Column({
    name: 'is_tenant_role',
    type: 'tinyint',
    width: 1,
    unsigned: true,
    default: 0,
  })
  @Index('roles_is_tenant_role')
  isTenantRole!: number;

  @Column({
    name: 'is_tenant_team_role',
    type: 'tinyint',
    width: 1,
    unsigned: true,
    default: 0,
  })
  @Index('roles_is_tenant_team_role')
  isTenantTeamRole!: number;

  @Column({
    name: 'is_customer_role',
    type: 'tinyint',
    width: 1,
    unsigned: true,
    default: 0,
  })
  isCustomerRole!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;

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
   * Represents the permissions associated with the role.
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
  userRoles!: UserRoleEntity[];

  /**
   * Relationship to TenantUserInvitationsEntity.
   * A role can be associated with multiple invitations.
   */
  @OneToMany(() => TenantUserInvitationsEntity, (invitation) => invitation.role)
  invitations!: TenantUserInvitationsEntity[];

  /**
   * Relationship to TenantTeamMemberEntity.
   * A role can be assigned to multiple team members.
   * Some team members may not have a role (nullable).
   */
  @OneToMany(() => TenantTeamMemberEntity, (teamMember) => teamMember.role, {
    nullable: true, // Explicitly handle nullability
  })
  teamMembers!: TenantTeamMemberEntity[] | null;
}
