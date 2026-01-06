import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { TenantTeamEntity } from '../../entities/tenant_team.entity';
import { TenantUsersEntity } from '../../../tenant_users/entities/tenant_user.entity';
import { RoleEntity } from '../../../../roles/entities/role.entity';

/**
 * Entity class for `tenant_team_members` table.
 *
 * Represents the members of a tenant team.
 */
@Entity('tenant_team_members')
@Unique('unique_team_member', ['tenantTeamId', 'tenantUserId'])
export class TenantTeamMemberEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_team_member_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantTeamMemberId!: number;

  @Column({
    name: 'tenant_team_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked team',
  })
  @Index('tenant_team_members_team_id')
  tenantTeamId!: number;

  @Column({
    name: 'tenant_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant user',
  })
  @Index('tenant_team_members_user_id')
  tenantUserId!: number;

  @Column({
    name: 'role_id',
    type: 'int',
    unsigned: true,
    default: 0,
    comment: 'Role of the user in the team',
  })
  roleId!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
    comment: 'When the user joined the team',
  })
  createdAt!: Date;

  /**
   * Relationship to TenantTeamEntity.
   * A member belongs to one team.
   */
  @ManyToOne(() => TenantTeamEntity, (team) => team.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_team_id' })
  team!: TenantTeamEntity;

  /**
   * Relationship to TenantUsersEntity.
   * A member is linked to one tenant user.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.teamMemberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_user_id' })
  user!: TenantUsersEntity;

  /**
   * Relationship to RoleEntity.
   * A member can have a role, which is nullable.
   */
  @ManyToOne(() => RoleEntity, (role) => role.teamMembers, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity | null;
}
