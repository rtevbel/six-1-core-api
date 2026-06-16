import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { PlatformActionEntity } from './platform_action.entity';
import { PlatformEventRecordEntity } from '../../platform-bus/entities/platform_event_record.entity';

@Entity('action_execution_log')
@Unique('uq_action_execution_record_action', ['eventRecordId', 'actionId'])
export class ActionExecutionLogEntity {
  @PrimaryGeneratedColumn({
    name: 'execution_id',
    type: 'bigint',
    unsigned: true,
  })
  executionId!: number;

  @Column({ name: 'event_record_id', type: 'bigint', unsigned: true })
  eventRecordId!: number;

  @Column({ name: 'action_id', type: 'bigint', unsigned: true })
  actionId!: number;

  @Column({ name: 'status', type: 'varchar', length: 32, default: 'pending' })
  status!: 'pending' | 'succeeded' | 'failed';

  @Column({ name: 'result', type: 'json', nullable: true })
  result?: Record<string, unknown> | null;

  @Column({ name: 'error_message', type: 'varchar', length: 2048, nullable: true })
  errorMessage?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @ManyToOne(() => PlatformEventRecordEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_record_id' })
  eventRecord?: PlatformEventRecordEntity;

  @ManyToOne(() => PlatformActionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'action_id' })
  action?: PlatformActionEntity;
}
