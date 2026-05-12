import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerEntity } from './customer.entity';

/**
 * Entity class for `customer_meta` table.
 *
 * Stores dynamic JSON field values for a customer instance, keyed by
 * configurable field keys defined in the config metadata layer.
 */
@Entity('customer_meta')
export class CustomerMetaEntity {
  @PrimaryGeneratedColumn({
    name: 'customer_meta_id',
    type: 'bigint',
    unsigned: true,
  })
  customerMetaId!: number;

  @Column({
    name: 'customer_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  customerId!: number;

  @Column({
    name: 'meta_json',
    type: 'json',
    nullable: false,
  })
  metaJson!: Record<string, unknown>;

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

  @OneToOne(() => CustomerEntity, (customer) => customer.meta, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;
}

