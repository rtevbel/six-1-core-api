import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';

/**
 * Entity class for `task_dependencies` table.
 *
 * Represents the dependencies between tasks.
 */
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';
@Entity('task_dependencies')
export class TaskDependencyEntity {
  @PrimaryGeneratedColumn({
    name: 'dependency_id',
    type: 'bigint',
    unsigned: true,
  })
  dependencyId!: number;

  @Column({
    name: 'task_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Dependent task',
  })
  taskId!: number;

  @Column({
    name: 'depends_on_task_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Task it depends on',
  })
  dependsOnTaskId!: number;

  @Column({
    name: 'dependency_type',
    type: 'enum',
    enum: ['FS', 'SS', 'FF', 'SF'],
    default: 'FS',
    comment: 'FS = Finish-to-Start',
  })
  dependencyType!: DependencyType;

  /**
   * Relationship to TaskEntity.
   * A dependency belongs to one task.
   */
  @ManyToOne(() => TaskEntity, (task) => task.dependencies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'task_id' })
  task!: TaskEntity;

  /**
   * Relationship to TaskEntity.
   * A dependency depends on another task.
   */
  @ManyToOne(() => TaskEntity, (task) => task.dependentTasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'depends_on_task_id' })
  dependsOnTask!: TaskEntity;
}
