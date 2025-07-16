import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entity class for `system_statuses` table.
 *
 * Represents the statuses in the system.
 */
@Entity('system_statuses')
export class SystemStatusEntity {
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  status_id!: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    unique: true,
    comment: 'Human-readable status name',
  })
  @Index('system_statuses_name')
  name!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  module_name!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  module_identifier!: string;

  @CreateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updated_at!: Date;
}
