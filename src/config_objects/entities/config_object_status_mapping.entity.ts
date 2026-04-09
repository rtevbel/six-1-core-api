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

export type ConfigObjectStatusSource =
  | 'system_status'
  | 'project_task_status'
  | 'native_enum'
  | 'custom';

/**
 * Maps lifecycle state keys to concrete persisted status values for a config object.
 *
 * `statusValue` is stored as string to support heterogeneous sources:
 * numeric IDs (`status_id`, `task_status_id`) and enum/string statuses.
 */
@Entity('config_object_status_mappings')
export class ConfigObjectStatusMappingEntity {
  @PrimaryGeneratedColumn({
    name: 'config_object_status_mapping_id',
    type: 'bigint',
    unsigned: true,
  })
  configObjectStatusMappingId!: number;

  @Column({
    name: 'config_object_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  configObjectId!: number;

  @Column({
    name: 'state_key',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  stateKey!: string;

  @Column({
    name: 'status_source',
    type: 'enum',
    enum: ['system_status', 'project_task_status', 'native_enum', 'custom'],
    nullable: false,
  })
  statusSource!: ConfigObjectStatusSource;

  @Column({
    name: 'status_value',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  statusValue!: string;

  @Column({
    name: 'is_default',
    type: 'tinyint',
    width: 1,
    default: 0,
  })
  isDefault!: boolean;

  @Column({
    name: 'is_terminal',
    type: 'tinyint',
    width: 1,
    default: 0,
  })
  isTerminal!: boolean;

  @Column({
    name: 'order_index',
    type: 'int',
    default: 0,
  })
  orderIndex!: number;

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

  @ManyToOne(
    () => ConfigObjectEntity,
    (configObject) => configObject.configObjectId,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'config_object_id' })
  configObject!: ConfigObjectEntity;
}
