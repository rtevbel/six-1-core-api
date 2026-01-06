import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { SharedEntityType } from './sharing_invitation.entity';

export type SharingAction =
  | 'shared'
  | 'requested'
  | 'accepted'
  | 'rejected'
  | 'revoked'
  | 'permission_updated';

@Entity('sharing_logs')
export class SharingLogEntity {
  @PrimaryGeneratedColumn({
    name: 'log_id',
    type: 'bigint',
    unsigned: true,
  })
  logId!: number;

  @Column({ name: 'sharing_id', type: 'bigint', unsigned: true })
  @Index('sharing_logs_sharing_id')
  sharingId!: number;

  @Column({
    name: 'shared_entity_type',
    type: 'enum',
    enum: ['resource', 'project', 'task'],
  })
  sharedEntityType!: SharedEntityType;

  @Column({
    name: 'action',
    type: 'enum',
    enum: [
      'shared',
      'requested',
      'accepted',
      'rejected',
      'revoked',
      'permission_updated',
    ],
  })
  action!: SharingAction;

  @Column({ name: 'performed_by', type: 'bigint', unsigned: true })
  performedBy!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @ManyToOne(() => TenantUsersEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'performed_by' })
  performer?: TenantUsersEntity;
}
