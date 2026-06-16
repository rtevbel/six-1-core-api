import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('process_step_locks')
export class ProcessStepLockEntity {
  @PrimaryGeneratedColumn({
    name: 'process_step_lock_id',
    type: 'bigint',
    unsigned: true,
  })
  processStepLockId!: number;

  @Column({
    name: 'step_instance_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  stepInstanceId!: number;

  @Column({
    name: 'tenant_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  tenantUserId!: number;

  @Column({
    name: 'expires_at',
    type: 'datetime',
    nullable: false,
  })
  expiresAt!: Date;

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
}

