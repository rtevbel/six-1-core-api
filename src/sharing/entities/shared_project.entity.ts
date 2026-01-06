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
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { SharingStatus } from './shared_resource.entity';

export { SharingStatus };

export type ProjectPermissionLevel = 'view' | 'edit' | 'manage';

@Entity('shared_projects')
export class SharedProjectEntity {
  @PrimaryGeneratedColumn({
    name: 'sharing_id',
    type: 'bigint',
    unsigned: true,
  })
  sharingId!: number;

  @Column({ name: 'project_id', type: 'bigint', unsigned: true })
  @Index('shared_projects_project_id')
  projectId!: number;

  @Column({ name: 'shared_by_tenant_id', type: 'bigint', unsigned: true })
  sharedByTenantId!: number;

  @Column({ name: 'shared_with_tenant_id', type: 'bigint', unsigned: true })
  sharedWithTenantId!: number;

  @Column({
    name: 'permission_level',
    type: 'enum',
    enum: ['view', 'edit', 'manage'],
    default: 'view',
  })
  permissionLevel!: ProjectPermissionLevel;

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

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

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
