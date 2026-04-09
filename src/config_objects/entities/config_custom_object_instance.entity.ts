import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConfigObjectEntity } from './config_object.entity';

/**
 * Lifecycle for a row in `config_custom_object_instances` (instance data, not schema).
 */
export type ConfigCustomObjectInstanceStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'ARCHIVED';

/**
 * Entity class for `config_custom_object_instances`.
 *
 * Stores per-tenant instance data for configurable objects with
 * `binding_mode === 'standalone'` (payload JSON keyed by `field_key`).
 */
@Entity('config_custom_object_instances')
export class ConfigCustomObjectInstanceEntity {
  @PrimaryGeneratedColumn({
    name: 'config_custom_object_instance_id',
    type: 'bigint',
    unsigned: true,
  })
  configCustomObjectInstanceId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  tenantId!: number;

  @Column({
    name: 'config_object_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  configObjectId!: number;

  @Column({
    name: 'payload',
    type: 'json',
    nullable: false,
  })
  payload!: Record<string, unknown>;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    default: 'DRAFT',
  })
  status!: ConfigCustomObjectInstanceStatus;

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
    nullable: true,
  })
  updatedBy!: number | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
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

  @ManyToOne(() => ConfigObjectEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'config_object_id' })
  configObject!: ConfigObjectEntity;
}
