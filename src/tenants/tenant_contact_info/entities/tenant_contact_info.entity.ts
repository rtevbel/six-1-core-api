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
 * Entity class for `tenant_contact_info` table.
 *
 * Represents the contact information for tenants.
 */
@Entity('tenant_contact_info')
export class TenantContactInfoEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_contact_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantContactId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant',
  })
  @Index('tenant_contact_info_tenant_id')
  tenantId!: number;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Primary email',
  })
  email!: string;

  @Column({
    name: 'phone',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Primary phone number',
  })
  phone!: string;

  @Column({
    name: 'address',
    type: 'text',
    nullable: true,
    comment: 'Physical address',
  })
  address!: string;

  @Column({
    name: 'city',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'City',
  })
  city!: string;

  @Column({
    name: 'state',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'State',
  })
  state!: string;

  @Column({
    name: 'country',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Country',
  })
  country!: string;

  @Column({
    name: 'postal_code',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Postal code',
  })
  postalCode!: string;

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
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;

  /**
   * Relationship to TenantEntity.
   * A tenant contact info belongs to one tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.contactInfo, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;
}
