import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ScheduledTaskEntity } from './scheduled_task.entity';

/**
 * Entity class for `scheduled_task_history` table.
 *
 * Represents the history of scheduled tasks.
 */
@Entity('scheduled_task_history')
export class ScheduledTaskHistoryEntity {
  @PrimaryGeneratedColumn({
    name: 'history_id',
    type: 'bigint',
    unsigned: true,
  })
  historyId!: number;

  @Column({
    name: 'scheduled_task_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  @Index('idx_sched_hist_task_ver')
  scheduledTaskId!: number;

  @Column({
    name: 'version',
    type: 'int',
    unsigned: true,
    nullable: false,
  })
  @Index('idx_sched_hist_task_ver')
  version!: number;

  @Column({
    name: 'snapshot',
    type: 'json',
    nullable: false,
    comment: 'Dump of the row or selected fields',
  })
  snapshot!: object;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  /**
   * Relationship to ScheduledTaskEntity.
   * A history record belongs to one scheduled task.
   */
  @ManyToOne(
    () => ScheduledTaskEntity,
    (scheduledTask) => scheduledTask.history,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'scheduled_task_id' })
  scheduledTask!: ScheduledTaskEntity;
}
