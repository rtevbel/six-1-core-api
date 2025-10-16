import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
  } from 'typeorm';
  import { TaskEntity } from '../../entities/task.entity';
  import { TenantUsersEntity } from '../../../../tenants/tenant_users/entities/tenant_user.entity';
  import { TaskAttachmentsEntity } from '../../attachments/entities/attachment.entity';
  import { TaskMentionsEntity } from '../../mentions/entities/mention.entity';
  
  /**
   * Entity class for `task_comments` table.
   */
  @Entity('task_comments')
  export class TaskCommentsEntity {
    @PrimaryGeneratedColumn({
      name: 'comment_id',
      type: 'bigint',
      unsigned: true,
    })
    commentId!: number;
  
    @Column({
      name: 'task_id',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'Linked task',
    })
    taskId!: number;
  
    @Column({
      name: 'comment',
      type: 'text',
      nullable: false,
      comment: 'Content of the comment',
    })
    comment!: string;
  
    @Column({
      name: 'created_by',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'Tenant User who created the comment',
    })
    createdBy!: number;
  
    @Column({
      name: 'updated_by',
      type: 'bigint',
      unsigned: true,
      default: 0,
      comment: 'Tenant User who updated the comment',
    })
    updatedBy!: number;
  
    @CreateDateColumn({
      name: 'created_at',
      type: 'datetime',
      default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt!: Date;
  
    @UpdateDateColumn({
      name: 'updated_at',
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
      onUpdate: 'CURRENT_TIMESTAMP',
    })
    updatedAt!: Date;
  
    /**
     * Many-to-one relationship with the `TaskEntity`.
     * A comment belongs to a single task.
     */
    @ManyToOne(() => TaskEntity, (task) => task.comments, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'task_id' })
    task!: TaskEntity;
  
    /**
     * Many-to-one relationship with the `TenantUsersEntity` for the user who created the comment.
     */
    @ManyToOne(() => TenantUsersEntity, (user) => user.createdComments)
    @JoinColumn({ name: 'created_by' })
    createdByUser!: TenantUsersEntity;
  
    /**
     * Many-to-one relationship with the `TenantUsersEntity` for the user who last updated the comment.
     * This relationship is nullable and uses `SET NULL` on delete.
     */
    @ManyToOne(() => TenantUsersEntity, (user) => user.updatedComments, {
      nullable: true,
      onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'updated_by' })
    updatedByUser?: TenantUsersEntity;

   /**
     * One-to-many relationship with the `TaskAttachmentsEntity`.
     * A comment can have multiple attachments.
    */
    @OneToMany(() => TaskAttachmentsEntity, (attachment) => attachment.comment, {
      cascade: true,
    })
    attachments!: TaskAttachmentsEntity[];
    
  /**
   * One-to-many relationship with the `TaskMentionsEntity`.
   * A comment can have multiple mentions.
   */
    @OneToMany(() => TaskMentionsEntity, (mention) => mention.comment, {
      cascade: true,
    })
    mentions!: TaskMentionsEntity[];

  }