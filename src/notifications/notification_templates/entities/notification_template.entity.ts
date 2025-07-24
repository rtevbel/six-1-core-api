import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany
  } from 'typeorm';
  import { NotificationChannelEntity } from '../../notification_channels/entities/notification_channel.entity';
  import { UserEntity } from '../../../users/entities/user.entity';
import { EventListenerEntity } from '../../../events/event_listeners/entities/event_listener.entity';
  
  /**
   * Entity class for `notification_templates` table.
   *
   * Represents the notification templates in the system.
   */
  @Entity('notification_templates')
  export class NotificationTemplateEntity {
    @PrimaryGeneratedColumn({
      name: 'template_id',
      type: 'bigint',
      unsigned: true,
    })
    templateId!: number;
  
    @Column({
      name: 'name',
      type: 'varchar',
      length: 255,
      nullable: false,
      comment: 'Name of the template',
    })
    name!: string;
  
    @Column({
      name: 'subject',
      type: 'varchar',
      length: 255,
      nullable: true,
      comment: 'Subject of the notification',
    })
    subject?: string;
  
    @Column({
      name: 'message',
      type: 'text',
      nullable: false,
      comment: 'Template content',
    })
    message!: string;
  
    @Column({
      name: 'channel_id',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'Linked channel',
    })
    channelId!: number;
  
    @Column({
      name: 'created_by',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'WP User who created the comment',
    })
    createdBy!: number;
  
    @Column({
      name: 'updated_by',
      type: 'bigint',
      unsigned: true,
      nullable: true,
      default: 0,
      comment: 'WP User who updated the comment',
    })
    updatedBy?: number;
  
    @CreateDateColumn({
      name: 'created_at',
      type: 'datetime',
      default: () => 'CURRENT_TIMESTAMP(6)',
    })
    createdAt!: Date;
  
    @UpdateDateColumn({
      name: 'updated_at',
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP(6)',
      onUpdate: 'CURRENT_TIMESTAMP(6)',
    })
    updatedAt!: Date;
  
    /**
     * Relationship to NotificationChannelEntity for channel_id.
     */
    @ManyToOne(() => NotificationChannelEntity, (channel) => channel.templateEntities, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'channel_id' })
    channel!: NotificationChannelEntity;
  
    /**
     * Relationship to UserEntity for created_by.
     */
    @ManyToOne(() => UserEntity, (user) => user.createdNotificationTemplates, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'created_by' })
    creator!: UserEntity;
  
    /**
     * Relationship to UserEntity for updated_by.
     */
    @ManyToOne(() => UserEntity, (user) => user.updatedNotificationTemplates, {
      onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'updated_by' })
    updater?: UserEntity;

   /**
   * Relationship to EventListenerEntity for template_id.
   */
    @OneToMany(() => EventListenerEntity, (eventListener) => eventListener.template)
    eventListeners!: EventListenerEntity[];
  }