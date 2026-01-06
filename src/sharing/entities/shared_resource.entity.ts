import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResourceEntity } from '../../scheduler/entities/resource.entity';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';

export type ResourcePermissionLevel = 'view' | 'use' | 'manage';
export type SharingStatus = 'pending' | 'active' | 'revoked';

@Entity('shared_resources')
export class SharedResourceEntity {
  @PrimaryGeneratedColumn({
    name: 'sharing_id',
    type: 'bigint',
    unsigned: true,
  })
  sharingId!: number;

  @Column({ name: 'resource_id', type: 'bigint', unsigned: true })
  @Index('shared_resources_resource_id')
  resourceId!: number;

  @Column({ name: 'shared_by_tenant_id', type: 'bigint', unsigned: true })
  @Index('shared_resources_shared_by_tenant_id')
  sharedByTenantId!: number;

  @Column({ name: 'shared_with_tenant_id', type: 'bigint', unsigned: true })
  @Index('shared_resources_shared_with_tenant_id')
  sharedWithTenantId!: number;

  @Column({
    name: 'permission_level',
    type: 'enum',
    enum: ['view', 'use', 'manage'],
    default: 'view',
  })
  permissionLevel!: ResourcePermissionLevel;

  @Column({
    name: 'valid_from',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  validFrom!: Date;

  @Column({ name: 'valid_until', type: 'datetime', nullable: true })
  validUntil?: Date;

  @Column({
    name: 'sharing_status',
    type: 'enum',
    enum: ['pending', 'active', 'revoked'],
    default: 'pending',
  })
  sharingStatus!: SharingStatus;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @Column({ name: 'revoked_at', type: 'datetime', nullable: true })
  revokedAt?: Date;

  @Column({
    name: 'revoked_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  revokedBy?: number;

  @ManyToOne(() => ResourceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource!: ResourceEntity;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shared_by_tenant_id' })
  sharedByTenant!: TenantEntity;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shared_with_tenant_id' })
  sharedWithTenant!: TenantEntity;

  @ManyToOne(() => TenantUsersEntity, { nullable: true })
  @JoinColumn({ name: 'revoked_by' })
  revokedByUser?: TenantUsersEntity;
}
