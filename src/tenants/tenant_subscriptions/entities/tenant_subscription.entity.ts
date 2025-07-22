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
 * Entity class for `tenant_subscriptions` table.
 *
 * Represents the subscription information for tenants.
 */
@Entity('tenant_subscriptions')
export class TenantSubscriptionEntity {
  @PrimaryGeneratedColumn({
    name: 'subscription_id',
    type: 'bigint',
    unsigned: true,
  })
  subscriptionId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant',
  })
  @Index('tenant_subscriptions_tenant_id')
  tenantId!: number;

  @Column({
    name: 'plan',
    type: 'enum',
    enum: ['free', 'basic', 'premium'],
    nullable: false,
    default: 'free',
    comment: 'Subscription plan',
  })
  plan!: 'free' | 'basic' | 'premium';

  @Column({
    name: 'start_date',
    type: 'date',
    nullable: false,
    comment: 'Subscription start date',
  })
  startDate!: Date;

  @Column({
    name: 'end_date',
    type: 'date',
    nullable: true,
    comment: 'Subscription end date',
  })
  endDate!: Date | null;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    unsigned: true,
    default: 1,
    comment: 'Is active',
  })
  isActive!: boolean;

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
   * A tenant subscription belongs to one tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.subscriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;
}
