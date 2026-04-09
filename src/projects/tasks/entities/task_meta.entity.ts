import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskEntity } from './task.entity';

/**
 * Entity class for `task_meta` table.
 *
 * Stores dynamic JSON field values for a task instance, keyed by
 * configurable field keys defined in the config metadata layer.
 */
@Entity('task_meta')
export class TaskMetaEntity {
  @PrimaryGeneratedColumn({
    name: 'task_meta_id',
    type: 'bigint',
    unsigned: true,
  })
  taskMetaId!: number;

  @Column({
    name: 'task_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  taskId!: number;

  @Column({
    name: 'meta_json',
    type: 'json',
    nullable: false,
  })
  metaJson!: Record<string, unknown>;

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

  @OneToOne(() => TaskEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'task_id' })
  task!: TaskEntity;
}

