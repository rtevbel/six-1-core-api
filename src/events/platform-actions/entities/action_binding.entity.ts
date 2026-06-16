import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PlatformActionEntity } from './platform_action.entity';

@Entity('action_bindings')
export class ActionBindingEntity {
  @PrimaryGeneratedColumn({
    name: 'binding_id',
    type: 'bigint',
    unsigned: true,
  })
  bindingId!: number;

  @Column({ name: 'tenant_id', type: 'bigint', unsigned: true, default: 0 })
  tenantId!: number;

  @Column({ name: 'on_event_name', type: 'varchar', length: 255 })
  onEventName!: string;

  @Column({ name: 'action_id', type: 'bigint', unsigned: true })
  actionId!: number;

  @Column({ name: 'filter_json', type: 'json', nullable: true })
  filterJson?: Record<string, unknown> | null;

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

  @ManyToOne(() => PlatformActionEntity, (action) => action.bindings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'action_id' })
  action?: PlatformActionEntity;
}
