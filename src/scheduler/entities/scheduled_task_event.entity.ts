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
   * Entity class for `scheduled_task_events` table.
   *
   * Represents the events associated with scheduled tasks.
   */
  @Entity('scheduled_task_events')
  export class ScheduledTaskEventsEntity {
    @PrimaryGeneratedColumn({
      name: 'event_id',
      type: 'bigint',
      unsigned: true,
    })
    eventId!: number;
  
    @Column({
      name: 'scheduled_task_id',
      type: 'bigint',
      unsigned: true,
      nullable: false,
    })
    @Index('idx_sched_events_task_when')
    scheduledTaskId!: number;
  
    @Column({
      name: 'kind',
      type: 'enum',
      enum: [
        'enqueued_start',
        'enqueued_end',
        'run_start',
        'run_end',
        'deferred',
        'failed',
        'cancelled',
        'paused',
        'resumed',
      ],
      nullable: false,
    })
    kind!: string;
  
    @CreateDateColumn({
      name: 'when_utc',
      type: 'datetime',
      precision: 6,
      default: () => 'CURRENT_TIMESTAMP(6)',
    })
    @Index('idx_sched_events_task_when')
    whenUtc!: Date;
  
    @Column({
      name: 'job_id',
      type: 'varchar',
      length: 128,
      nullable: true,
    })
    jobId!: string | null;
  
    @Column({
      name: 'details',
      type: 'json',
      nullable: true,
    })
    details!: object | null;
  
    /**
     * Relationship to ScheduledTaskEntity.
     * An event belongs to one scheduled task.
     */
    @ManyToOne(() => ScheduledTaskEntity, (scheduledTask) => scheduledTask.events, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'scheduled_task_id' })
    scheduledTask!: ScheduledTaskEntity;
  }