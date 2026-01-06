import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CustomerEntity } from '../../entities/customer.entity';

@Entity('customer_contact_info')
export class CustomerContactInfoEntity {
  @PrimaryGeneratedColumn({
    name: 'customer_contact_id',
    type: 'bigint',
    unsigned: true,
  })
  customerContactId!: number;

  @Column({
    name: 'customer_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked customer',
  })
  @Index('customer_contact_info_customer_id')
  customerId!: number;

  @Column({
    name: 'secondary_email',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Secondary email address',
  })
  secondaryEmail!: string;

  @Column({
    name: 'phone',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Primary phone number',
  })
  phone!: string | null;

  @Column({
    name: 'address',
    type: 'text',
    nullable: true,
    comment: 'Physical address',
  })
  address!: string | null;

  @Column({
    name: 'city',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'City',
  })
  city!: string | null;

  @Column({
    name: 'state',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'State/Province',
  })
  state!: string | null;

  @Column({
    name: 'country',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Country',
  })
  country!: string | null;

  @Column({
    name: 'postal_code',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Postal code',
  })
  postalCode!: string | null;

  @Column({
    name: 'timezone',
    type: 'varchar',
    length: 50,
    default: () => "'UTC'",
  })
  timezone!: string;

  @Column({
    name: 'language_id',
    type: 'tinyint',
    unsigned: true,
    default: () => '1',
  })
  @Index('customer_contact_info_language_id')
  languageId!: number;

  @Column({
    name: 'default_currency',
    type: 'varchar',
    length: 10,
    default: () => "'USD'",
  })
  defaultCurrency!: string;

  @Column({
    name: 'notification_preferences',
    type: 'varchar',
    length: 255,
    default: () => "'email'",
  })
  notificationPreferences!: string;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  @Index('customer_contact_info_created_by')
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    default: () => '0',
  })
  @Index('customer_contact_info_updated_by')
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

  @ManyToOne(() => CustomerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;
}
