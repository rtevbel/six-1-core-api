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
import { TenantUsersEntity } from '../../tenant_users/entities/tenant_user.entity';

/**
 * Entity class for `tenant_off_days` table.
 *
 * Represents the off days for tenants.
 */
@Entity('tenant_off_days')
export class TenantOffDaysEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_off_day_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantOffDayId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant',
  })
  @Index('tenant_off_days_tenant_id')
  tenantId!: number;

  @Column({
    name: 'off_date',
    type: 'date',
    nullable: false,
    comment: 'Date of the off day',
  })
  offDate!: Date;

  @Column({
    name: 'description',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Reason for the off day (e.g., holiday)',
  })
  description!: string;

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
   * A tenant off day belongs to one tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.offDays, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;
}
