import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { TaskEntity } from '../../entities/task.entity';
import { TaskCommentsEntity } from '../../comments/entities/comment.entity';
import { TenantUsersEntity } from '../../../../tenants/tenant_users/entities/tenant_user.entity';

/**
 * Entity class for `task_mentions` table.
 */
@Entity('task_mentions')
@Check(`
    (task_id IS NOT NULL AND comment_id IS NULL) OR 
    (task_id IS NULL AND comment_id IS NOT NULL)
  `)
export class TaskMentionsEntity {
  @PrimaryGeneratedColumn({
    name: 'mention_id',
    type: 'bigint',
    unsigned: true,
  })
  mentionId!: number;

  @Column({
    name: 'task_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Linked task (if tagging in a task)',
  })
  taskId?: number;

  @Column({
    name: 'comment_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Linked comment (if tagging in a comment)',
  })
  commentId?: number;

  @Column({
    name: 'mentioned_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'User who was tagged',
  })
  mentionedUserId!: number;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'User who tagged',
  })
  createdBy!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  /**
   * Many-to-one relationship with the `TaskEntity`.
   * A mention can be linked to a single task.
   */
  @ManyToOne(() => TaskEntity, (task) => task.mentions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'task_id' })
  task?: TaskEntity;

  /**
   * Many-to-one relationship with the `TaskCommentsEntity`.
   * A mention can be linked to a single comment.
   */
  @ManyToOne(() => TaskCommentsEntity, (comment) => comment.mentions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'comment_id' })
  comment?: TaskCommentsEntity;

  /**
   * Many-to-one relationship with the `TenantUsersEntity`.
   * This represents the user who was mentioned.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.mentions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'mentioned_user_id' })
  mentionedUser!: TenantUsersEntity;

  /**
   * Many-to-one relationship with the `TenantUsersEntity`.
   * This represents the user who created the mention.
   */
  @ManyToOne(() => TenantUsersEntity, (user) => user.createdMentions)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;
}
