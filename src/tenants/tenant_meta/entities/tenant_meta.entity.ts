import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { TenantEntity } from '../../entities/tenant.entity';

/**
 * Entity class for `tenant_meta` table.
 *
 * Represents metadata associated with tenants.
 */
@Entity('tenant_meta')
@Unique('unique_meta', ['tenantId', 'metaKey']) // Enforces the unique key constraint
export class TenantMetaEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_meta_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantMetaId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant',
  })
  tenantId!: number;

  @Column({
    name: 'meta_key',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Key for the metadata',
  })
  metaKey!: string;

  @Column({
    name: 'meta_value',
    type: 'text',
    nullable: true,
    comment: 'Value for the metadata',
  })
  metaValue!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;

  /**
   * Relationship to TenantEntity.
   * A tenant meta belongs to one tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.tenantMeta, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;
}
