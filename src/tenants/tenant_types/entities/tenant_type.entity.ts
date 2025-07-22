import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TenantEntity } from '../../entities/tenant.entity';
import { SystemStatusEntity } from '../../../settings/system_statuses/entities/system-status.entity';

/**
 * Entity class for `tenant_types` table.
 *
 * Represents the tenant types in the system.
 */
@Entity('tenant_types')
export class TenantTypeEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_type_id',
    type: 'tinyint',
    unsigned: true,
  })
  tenantTypeId!: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: false,
    comment: 'Human-readable tenant name like company, freelancer',
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
    comment: 'Human-readable tenant name like company, freelancer',
  })
  description!: string;

  @Column({
    name: 'status_id',
    type: 'tinyint',
    unsigned: true,
    nullable: false,
    comment: 'Tenant status',
  })
  @Index('tenant_types_status_id')
  statusId!: number;

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
   * Relationship to TenantEntity.
   * A tenant type can have multiple Tenant records.
   */
  @OneToMany(() => TenantEntity, (tenant) => tenant.tenantType)
  tenants!: TenantEntity[];

  /**
   * Relationship to SystemStatusEntity.
   * A tenant type can have one status record.
   */
  @OneToOne(() => SystemStatusEntity, (statuses) => statuses.tennant_type, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'status_id' })
  status!: SystemStatusEntity;
}
