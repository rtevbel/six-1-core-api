import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type PlatformEventRecordStatus = 'recorded' | 'dispatched' | 'failed';

@Entity('platform_event_records')
export class PlatformEventRecordEntity {
  @PrimaryGeneratedColumn({
    name: 'record_id',
    type: 'bigint',
    unsigned: true,
  })
  recordId!: number;

  @Column({ name: 'event_name', type: 'varchar', length: 255 })
  eventName!: string;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  tenantId?: number | null;

  @Column({
    name: 'correlation_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  correlationId?: string | null;

  @Column({
    name: 'causation_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  causationId?: string | null;

  @Column({
    name: 'entity_type',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  entityType?: string | null;

  @Column({
    name: 'entity_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  entityId?: number | null;

  @Column({ name: 'payload', type: 'json', nullable: true })
  payload?: Record<string, unknown> | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    default: 'recorded',
  })
  status!: PlatformEventRecordStatus;

  @Column({
    name: 'occurred_at',
    type: 'datetime',
    precision: 6,
  })
  occurredAt!: Date;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
  })
  createdAt!: Date;
}
