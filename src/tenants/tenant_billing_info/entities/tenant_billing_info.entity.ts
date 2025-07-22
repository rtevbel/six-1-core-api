import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantEntity } from '../../entities/tenant.entity';

/**
 * Entity class for `tenant_billing_info` table.
 *
 * Represents the billing information for tenants.
 */
@Entity('tenant_billing_info')
export class TenantBillingInfoEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_billing_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantBillingId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant',
  })
  @Index('tenant_billing_info_tenant_id')
  tenantId!: number;

  @Column({
    name: 'billing_email',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Billing email address',
  })
  billingEmail!: string;

  @Column({
    name: 'billing_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Billing phone number',
  })
  billingPhone!: string;

  @Column({
    name: 'billing_address',
    type: 'text',
    nullable: true,
    comment: 'Billing physical address',
  })
  billingAddress!: string;

  @Column({
    name: 'billing_city',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Billing city',
  })
  billingCity!: string;

  @Column({
    name: 'billing_state',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Billing state',
  })
  billingState!: string;

  @Column({
    name: 'billing_country',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Billing country',
  })
  billingCountry!: string;

  @Column({
    name: 'billing_postal_code',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Billing postal code',
  })
  billingPostalCode!: string;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    default: 0,
  })
  updatedBy!: number;

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
   * A tenant billing info belongs to one tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.billingInfo, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;
}
