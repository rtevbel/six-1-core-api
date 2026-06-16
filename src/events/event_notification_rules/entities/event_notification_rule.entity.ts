import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationChannelEntity } from '../../../notifications/notification_channels/entities/notification_channel.entity';
import { NotificationTemplateEntity } from '../../../notifications/notification_templates/entities/notification_template.entity';
import { UserEntity } from '../../../users/entities/user.entity';
import type { RecipientSpec } from '../../notification-rules/recipient-spec.types';

@Entity('event_notification_rules')
export class EventNotificationRuleEntity {
  @PrimaryGeneratedColumn({
    name: 'rule_id',
    type: 'bigint',
    unsigned: true,
  })
  ruleId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: '0 = global default',
  })
  tenantId!: number;

  @Column({
    name: 'event_name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  eventName!: string;

  @Column({
    name: 'filter_json',
    type: 'json',
    nullable: true,
  })
  filterJson?: Record<string, unknown> | null;

  @Column({
    name: 'channel_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  channelId!: number;

  @Column({
    name: 'template_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  templateId!: number;

  @Column({
    name: 'recipient_spec',
    type: 'json',
    nullable: false,
  })
  recipientSpec!: RecipientSpec;

  @Column({
    name: 'priority',
    type: 'int',
    default: 100,
  })
  priority!: number;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    width: 1,
    default: true,
  })
  isActive!: boolean;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    default: 0,
  })
  updatedBy?: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
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

  @ManyToOne(() => NotificationChannelEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel?: NotificationChannelEntity;

  @ManyToOne(() => NotificationTemplateEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template?: NotificationTemplateEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}
