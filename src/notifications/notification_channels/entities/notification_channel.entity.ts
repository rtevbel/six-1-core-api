import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
    OneToMany
  } from 'typeorm';
  import { UserEntity } from '../../../users/entities/user.entity';
import { NotificationTemplateEntity } from '../../notification_templates/entities/notification_template.entity';
import { EventListenerEntity } from '../../../events/event_listeners/entities/event_listener.entity';
  
  /**
   * Entity class for `notification_channels` table.
   *
   * Represents the notification channels in the system.
   */
  @Entity('notification_channels')
  export class NotificationChannelEntity {
    @PrimaryGeneratedColumn({
      name: 'channel_id',
      type: 'bigint',
      unsigned: true,
    })
    channelId!: number;
  
    @Column({
      name: 'name',
      type: 'varchar',
      length: 255,
      nullable: false,
      comment: 'Name of the channel (e.g., email, SMS, push)',
    })
    @Index('unique_channel_name', { unique: true })
    name!: string;
  
    @Column({
      name: 'description',
      type: 'text',
      nullable: true,
      comment: 'Description of the channel',
    })
    description?: string;
  
    @Column({
      name: 'created_by',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'WP User who created the comment',
    })
    @Index('notification_channels_created_by')
    createdBy!: number;
  
    @Column({
      name: 'updated_by',
      type: 'bigint',
      unsigned: true,
      nullable: true,
      default: 0,
      comment: 'WP User who updated the comment',
    })
    @Index('notification_channels_updated_by')
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
     * Relationship to UserEntity for created_by.
     */
    @ManyToOne(() => UserEntity, (user) => user.createdNotificationChannels, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'created_by' })
    creator!: UserEntity;
  
    /**
     * Relationship to UserEntity for updated_by.
     */
    @ManyToOne(() => UserEntity, (user) => user.updatedNotificationChannels, {
      onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'updated_by' })
    updater?: UserEntity;

  /**
   *  Relationship to NotificationTemplateEntity for channel_id.
   */
    @OneToMany(() => NotificationTemplateEntity, (template) => template.channel, {
        cascade: true,
    })
    templateEntities!: NotificationTemplateEntity[];

   /**
    * Relationship to EventListenerEntity for channel_id.
    */
    @OneToMany(() => EventListenerEntity, (eventListener) => eventListener.channel)
    eventListeners!: EventListenerEntity[];
  }