import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConfigObjectEntity } from './config_object.entity';
import { ConfigObjectViewPanelEntity } from './config_object_view_panel.entity';

/**
 * Entity class for `config_object_views` table.
 *
 * Describes a named view for an object type (list, board, or detail),
 * optionally scoped by role and marked as the default for that object.
 */
@Entity('config_object_views')
export class ConfigObjectViewEntity {
  @PrimaryGeneratedColumn({
    name: 'config_object_view_id',
    type: 'bigint',
    unsigned: true,
  })
  configObjectViewId!: number;

  @Column({
    name: 'config_object_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  configObjectId!: number;

  @Column({
    name: 'view_key',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  viewKey!: string;

  @Column({
    name: 'view_type',
    type: 'enum',
    enum: ['list', 'board', 'detail'],
    default: 'list',
  })
  viewType!: 'list' | 'board' | 'detail';

  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    name: 'role_key',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  roleKey!: string | null;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  tenantId!: number | null;

  @Column({
    name: 'is_default',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  isDefault!: boolean;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    unsigned: true,
    default: 1,
  })
  isActive!: boolean;

  @Column({
    name: 'config_json',
    type: 'json',
    nullable: true,
  })
  configJson!: Record<string, unknown> | null;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  createdBy!: number | null;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  updatedBy!: number | null;

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

  @ManyToOne(
    () => ConfigObjectEntity,
    (configObject) => configObject.views,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'config_object_id' })
  configObject!: ConfigObjectEntity;

  @OneToMany(
    () => ConfigObjectViewPanelEntity,
    (panel) => panel.view,
  )
  panels!: ConfigObjectViewPanelEntity[];
}

