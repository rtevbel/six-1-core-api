import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ConfigObjectViewEntity } from './config_object_view.entity';

/**
 * Entity class for `config_object_view_panels` table.
 *
 * Represents a single panel within a view (e.g. summary, section, related objects),
 * including its type, layout configuration, and ordering.
 */
@Entity('config_object_view_panels')
export class ConfigObjectViewPanelEntity {
  @PrimaryGeneratedColumn({
    name: 'config_object_view_panel_id',
    type: 'bigint',
    unsigned: true,
  })
  configObjectViewPanelId!: number;

  @Column({
    name: 'config_object_view_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  configObjectViewId!: number;

  @Column({
    name: 'panel_key',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  panelKey!: string;

  @Column({
    name: 'title',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  title!: string;

  @Column({
    name: 'panel_type',
    type: 'enum',
    enum: ['summary', 'section', 'related', 'custom'],
    default: 'section',
  })
  panelType!: 'summary' | 'section' | 'related' | 'custom';

  @Column({
    name: 'layout_config',
    type: 'json',
    nullable: true,
  })
  layoutConfig!: Record<string, unknown> | null;

  @Column({
    name: 'order_index',
    type: 'int',
    default: 0,
  })
  orderIndex!: number;

  @ManyToOne(
    () => ConfigObjectViewEntity,
    (view) => view.panels,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'config_object_view_id' })
  view!: ConfigObjectViewEntity;
}

