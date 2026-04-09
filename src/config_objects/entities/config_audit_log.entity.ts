import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';

/**
 * Entity class for `config_audit_logs` table.
 *
 * Stores an immutable history of configuration changes for a tenant,
 * including before/after snapshots and the actor who performed the change.
 */
@Entity('config_audit_logs')
export class ConfigAuditLogEntity {
  @PrimaryGeneratedColumn({
    name: 'config_audit_log_id',
    type: 'bigint',
    unsigned: true,
  })
  configAuditLogId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  tenantId!: number | null;

  @Column({
    name: 'entity_type',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  entityType!: string;

  @Column({
    name: 'entity_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  entityId!: number;

  @Column({
    name: 'action',
    type: 'enum',
    enum: ['create', 'update', 'delete'],
    nullable: false,
  })
  action!: 'create' | 'update' | 'delete';

  @Column({
    name: 'old_value',
    type: 'json',
    nullable: true,
  })
  oldValue!: Record<string, unknown> | null;

  @Column({
    name: 'new_value',
    type: 'json',
    nullable: true,
  })
  newValue!: Record<string, unknown> | null;

  @Column({
    name: 'changed_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  changedBy!: number;

  @CreateDateColumn({
    name: 'changed_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  changedAt!: Date;

  @ManyToOne(() => TenantEntity, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity | null;

  @ManyToOne(() => TenantUsersEntity)
  @JoinColumn({ name: 'changed_by' })
  changedByUser!: TenantUsersEntity;
}

