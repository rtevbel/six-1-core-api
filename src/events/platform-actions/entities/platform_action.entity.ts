import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { PlatformActionConfig, PlatformActionType } from '../types/platform-action.types';
import { ActionBindingEntity } from './action_binding.entity';

@Entity('platform_actions')
export class PlatformActionEntity {
  @PrimaryGeneratedColumn({
    name: 'action_id',
    type: 'bigint',
    unsigned: true,
  })
  actionId!: number;

  @Column({ name: 'tenant_id', type: 'bigint', unsigned: true, default: 0 })
  tenantId!: number;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'description', type: 'varchar', length: 512, nullable: true })
  description?: string | null;

  @Column({ name: 'action_type', type: 'varchar', length: 64 })
  actionType!: PlatformActionType;

  @Column({ name: 'config', type: 'json' })
  config!: PlatformActionConfig;

  @Column({ name: 'priority', type: 'int', default: 100 })
  priority!: number;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: true })
  isActive!: boolean;

  @Column({ name: 'created_by', type: 'bigint', unsigned: true })
  createdBy!: number;

  @Column({ name: 'updated_by', type: 'bigint', unsigned: true, nullable: true, default: 0 })
  updatedBy?: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @OneToMany(() => ActionBindingEntity, (binding) => binding.action)
  bindings?: ActionBindingEntity[];
}
