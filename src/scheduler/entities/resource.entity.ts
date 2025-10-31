import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { ResourceAssignmentEntity } from './resource_assignment.entity';

/**
 * Entity class for `resources` table.
 *
 * Represents resources (human or equipment) available for scheduling.
 */
@Entity('resources')
export class ResourceEntity {
  @PrimaryGeneratedColumn({ name: 'resource_id', type: 'bigint', unsigned: true })
  resourceId!: number;

  @Column({ name: 'name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({
    name: 'tenant_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    default: null,
    comment: 'User ID from tenant_users table if resource is human',
  })
  @Index('resources_tenant_user_id')
  tenantUserId?: number;

  @Column({
    name: 'type',
    type: 'enum',
    enum: ['equipment', 'human'],
    nullable: false,
  })
  type!: 'equipment' | 'human';

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Which company owns it',
  })
  @Index('resources_tenant_id')
  tenantId!: number;

  @Column({
    name: 'is_shared',
    type: 'tinyint',
    unsigned: true,
    default: 0,
    comment: 'Can other companies use it?',
  })
  isShared!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  /**
   * Relationship to TenantEntity.
   */
  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  /**
   * Relationship to TenantUsersEntity (if human resource).
   */
  @ManyToOne(() => TenantUsersEntity, { nullable: true })
  @JoinColumn({ name: 'tenant_user_id' })
  tenantUser?: TenantUsersEntity;

  /**
   * Inverse relationship to ResourceAssignmentEntity.
   */
  @OneToMany(() => ResourceAssignmentEntity, (assignment) => assignment.resource)
  assignments!: ResourceAssignmentEntity[];
}

