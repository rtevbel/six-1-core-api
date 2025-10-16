import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { TaskEntity } from '../../entities/task.entity';
  import { TaskCommentsEntity } from '../../comments/entities/comment.entity';
  import { TenantUsersEntity } from '../../../../tenants/tenant_users/entities/tenant_user.entity';
  
  /**
   * Entity class for `task_attachments` table.
   */
  @Entity('task_attachments')
  export class TaskAttachmentsEntity {
    @PrimaryGeneratedColumn({
      name: 'attachment_id',
      type: 'bigint',
      unsigned: true,
    })
    attachmentId!: number;
  
    @Column({
      name: 'task_id',
      type: 'bigint',
      unsigned: true,
      nullable: true,
      comment: 'Linked task (if attachment in a task)',
    })
    taskId?: number;
  
    @Column({
      name: 'comment_id',
      type: 'bigint',
      unsigned: true,
      nullable: true,
      comment: 'Linked comment (if attachment in a comment)',
    })
    commentId?: number;
  
    @Column({
      name: 'file_name',
      type: 'varchar',
      length: 255,
      nullable: false,
      comment: 'Name of the file',
    })
    fileName!: string;
  
    @Column({
      name: 'file_path',
      type: 'varchar',
      length: 255,
      nullable: false,
      comment: 'Path to the file',
    })
    filePath!: string;
  
    @Column({
      name: 'file_type',
      type: 'varchar',
      length: 50,
      nullable: false,
      comment: 'Type of the file (e.g., PDF, JPEG)',
    })
    fileType!: string;
  
    @Column({
      name: 'file_size',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'Size of the file in bytes',
    })
    fileSize!: number;
  
    @Column({
      name: 'file_hash',
      type: 'varbinary',
      length: 32,
      nullable: true,
      comment: 'SHA-256 hash of the file for integrity check',
    })
    fileHash?: Buffer;
  
    @Column({
      name: 'storage_provider',
      type: 'varchar',
      length: 32,
      nullable: true,
      comment: 'Storage provider (e.g., local, s3, gcs)',
    })
    storageProvider?: string;
  
    @Column({
      name: 'is_inline',
      type: 'tinyint',
      width: 1,
      nullable: false,
      default: 0,
      comment: 'If it was embedded in rich text',
    })
    isInline!: boolean;
  
    @Column({
      name: 'created_by',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'Tenant User who created the attachment',
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
     * An attachment can belong to a single task.
     */
    @ManyToOne(() => TaskEntity, (task) => task.attachments, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'task_id' })
    task?: TaskEntity;
  
    /**
     * Many-to-one relationship with the `TaskCommentsEntity`.
     * An attachment can belong to a single comment.
     */
    @ManyToOne(() => TaskCommentsEntity, (comment) => comment.attachments, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'comment_id' })
    comment?: TaskCommentsEntity;
  
    /**
     * Many-to-one relationship with the `TenantUsersEntity`.
     * This represents the user who created the attachment.
     */
    @ManyToOne(() => TenantUsersEntity, (user) => user.createdAttachments)
    @JoinColumn({ name: 'created_by' })
    createdByUser!: TenantUsersEntity;
  }