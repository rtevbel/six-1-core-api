import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerContactInfoEntity } from './customer_contact_info.entity';

/**
 * Entity class for `customer_contact_info_meta` table.
 *
 * Stores dynamic JSON field values for a customer contact instance, keyed by
 * configurable field keys defined in the config metadata layer.
 */
@Entity('customer_contact_info_meta')
export class CustomerContactInfoMetaEntity {
  @PrimaryGeneratedColumn({
    name: 'customer_contact_info_meta_id',
    type: 'bigint',
    unsigned: true,
  })
  customerContactInfoMetaId!: number;

  @Column({
    name: 'customer_contact_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  customerContactId!: number;

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

  @OneToOne(() => CustomerContactInfoEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_contact_id' })
  customerContactInfo!: CustomerContactInfoEntity;
}

