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
import { TenantUsersEntity } from '../../entities/tenant_user.entity';

/**
 * Entity class for `tenant_user_off_days` table.
 *
 * Represents the off days associated with tenant users.
 */
@Entity('tenant_user_off_days')
export class TenantUserOffDaysEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_user_off_day_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantUserOffDayId!: number;

  @Column({
    name: 'tenant_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant',
  })
  @Index('tenant_user_off_days_tenant_user_id')
  tenantUserId!: number;

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
  description?: string;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'User who created this record',
  })
  @Index('tenant_user_off_days_created_by')
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: 'User who last updated this record',
  })
  @Index('tenant_user_off_days_updated_by')
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
   * Relationship to TenantUsersEntity for tenantUserId.
   * An off day is linked to one tenant user.
   */
  @ManyToOne(() => TenantUsersEntity, (tenantUser) => tenantUser.offDays, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_user_id' })
  tenantUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for createdBy.
   * An off day is created by one user.
   */
  @ManyToOne(
    () => TenantUsersEntity,
    (tenantUser) => tenantUser.createdOffDays,
    {
      nullable: true,
    },
  )
  @JoinColumn({ name: 'created_by' })
  createdByUser?: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for updatedBy.
   * An off day is updated by one user.
   */
  @ManyToOne(
    () => TenantUsersEntity,
    (tenantUser) => tenantUser.updatedOffDays,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'updated_by' })
  updatedByUser?: TenantUsersEntity;
}
