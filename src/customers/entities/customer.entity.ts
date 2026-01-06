import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entity representing the `customers` table.
 */
@Entity('customers')
export class CustomerEntity {
  @PrimaryGeneratedColumn({
    name: 'customer_id',
    type: 'bigint',
    unsigned: true,
  })
  customerId!: number;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true,
    comment: 'Email of the customer',
  })
  @Index('unique_customer_email', { unique: true })
  email!: string;

  @Column({
    name: 'first_name',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Customer first name',
  })
  firstName!: string | null;

  @Column({
    name: 'last_name',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Customer last name',
  })
  lastName!: string | null;

  @Column({
    name: 'is_profile_completed',
    type: 'tinyint',
    unsigned: true,
    default: () => '0',
  })
  isProfileCompleted!: boolean;

  @Column({
    name: 'password',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Customer password',
  })
  password!: string;

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
}
