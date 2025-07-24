import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { EventEntity } from '../../entities/event.entity';
  import { NotificationChannelEntity } from '../../../notifications/notification_channels/entities/notification_channel.entity';
  import { NotificationTemplateEntity } from '../../../notifications/notification_templates/entities/notification_template.entity';
  import { UserEntity } from '../../../users/entities/user.entity';
  
  /**
   * Entity class for `event_listeners` table.
   *
   * Represents the event listeners in the system.
   */
  @Entity('event_listeners')
  export class EventListenerEntity {
    @PrimaryGeneratedColumn({
      name: 'listener_id',
      type: 'bigint',
      unsigned: true,
    })
    listenerId!: number;
  
    @Column({
      name: 'event_id',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'Linked event',
    })
    eventId!: number;
  
    @Column({
      name: 'channel_id',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'Linked notification channel',
    })
    channelId!: number;
  
    @Column({
      name: 'template_id',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'Linked notification template',
    })
    templateId!: number;
  
    @Column({
      name: 'is_active',
      type: 'tinyint',
      width: 1,
      default: true,
      comment: 'Whether the listener is active',
    })
    isActive!: boolean;
  
    @Column({
      name: 'created_by',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'WP User who created the listener',
    })
    createdBy!: number;
  
    @Column({
      name: 'updated_by',
      type: 'bigint',
      unsigned: true,
      nullable: true,
      default: 0,
      comment: 'WP User who updated the listener',
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
     * Relationship to EventEntity for event_id.
     */
    @ManyToOne(() => EventEntity, (event) => event.eventListeners, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'event_id' })
    event!: EventEntity;
  
    /**
     * Relationship to NotificationChannelEntity for channel_id.
     */
    @ManyToOne(() => NotificationChannelEntity, (channel) => channel.eventListeners, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'channel_id' })
    channel!: NotificationChannelEntity;
  
    /**
     * Relationship to NotificationTemplateEntity for template_id.
     */
    @ManyToOne(() => NotificationTemplateEntity, (template) => template.eventListeners, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'template_id' })
    template!: NotificationTemplateEntity;
  
    /**
     * Relationship to UserEntity for created_by.
     */
    @ManyToOne(() => UserEntity, (user) => user.createdEventListeners, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'created_by' })
    creator!: UserEntity;
  
    /**
     * Relationship to UserEntity for updated_by.
     */
    @ManyToOne(() => UserEntity, (user) => user.updatedEventListeners, {
      onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'updated_by' })
    updater?: UserEntity;
  }