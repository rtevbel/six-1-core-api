import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { TenantEntity } from '../../../entities/tenant.entity';
import { TenantUsersEntity } from '../../entities/tenant_user.entity';
import { RoleEntity } from '../../../../roles/entities/role.entity';
import { UserEntity } from '../../../../users/entities/user.entity';

/**
 * Entity class for `tenant_user_invitations` table.
 *
 * Represents the invitations sent to tenant users.
 */
@Entity('tenant_user_invitations')
export class TenantUserInvitationsEntity {
  @PrimaryGeneratedColumn({
    name: 'invitation_id',
    type: 'bigint',
    unsigned: true,
  })
  invitationId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant',
  })
  tenantId!: number;

  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Invited user ID',
  })
  userId!: number | null;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Email of the tenant user',
  })
  email!: string;

  @Column({
    name: 'token',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Invitation token',
  })
  token!: string;

  @Column({
    name: 'role_id',
    type: 'int',
    unsigned: true,
    nullable: false,
    comment: 'Role of the tenant user',
  })
  roleId!: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
    comment: 'Status of the invitation',
  })
  status!: 'pending' | 'accepted' | 'declined';

  @Column({
    name: 'invited_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'User who sent the invitation',
  })
  invitedBy!: number;

  @CreateDateColumn({
    name: 'invited_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
    comment: 'When the invitation was sent',
  })
  invitedAt!: Date;

  @Column({
    name: 'expires_at',
    type: 'datetime',
    nullable: true,
    comment: 'When the invitation expires',
  })
  expiresAt?: Date;

  /**
   * Relationship to UserEntity.
   * A tenant user can have one user record.
   */
  @OneToOne(() => UserEntity, (user) => user.tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  /**
   * Relationship to TenantEntity.
   * An invitation belongs to one tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.invitations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  /**
   * Relationship to TenantUsersEntity.
   * An invitation is sent by one tenant user.
   */
  @ManyToOne(
    () => TenantUsersEntity,
    (tenantUser) => tenantUser.sentInvitations,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'invited_by' })
  invitedByUser!: TenantUsersEntity;

  /**
   * Relationship to RolesEntity.
   * An invitation is associated with one role.
   */
  @ManyToOne(() => RoleEntity, (role) => role.invitations)
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;
}
