import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantEntity } from '../../tenants/entities/tenant.entity';

export type SharedEntityType = 'resource' | 'project' | 'task';
export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'requested';

@Entity('sharing_invitations')
export class SharingInvitationEntity {
  @PrimaryGeneratedColumn({
    name: 'invitation_id',
    type: 'bigint',
    unsigned: true,
  })
  invitationId!: number;

  @Column({
    name: 'shared_entity_type',
    type: 'enum',
    enum: ['resource', 'project', 'task'],
  })
  sharedEntityType!: SharedEntityType;

  @Column({ name: 'shared_entity_id', type: 'bigint', unsigned: true })
  @Index('sharing_invitations_entity')
  sharedEntityId!: number;

  @Column({ name: 'shared_by_tenant_id', type: 'bigint', unsigned: true })
  sharedByTenantId!: number;

  @Column({ name: 'shared_with_tenant_id', type: 'bigint', unsigned: true })
  sharedWithTenantId!: number;

  @Column({ name: 'invitation_token', type: 'varchar', length: 255 })
  invitationToken!: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt!: Date;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['pending', 'accepted', 'rejected', 'requested'],
    default: 'pending',
  })
  status!: InvitationStatus;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shared_by_tenant_id' })
  sharedByTenant!: TenantEntity;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shared_with_tenant_id' })
  sharedWithTenant!: TenantEntity;
}
