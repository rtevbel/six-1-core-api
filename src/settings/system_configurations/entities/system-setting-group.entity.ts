import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { SystemSettingDefinitionEntity } from './system-setting-definition.entity';

/**
 * Entity for `system_setting_groups` — module/domain grouping for settings.
 */
@Entity('system_setting_groups')
export class SystemSettingGroupEntity {
  @PrimaryGeneratedColumn({
    name: 'group_id',
    type: 'bigint',
    unsigned: true,
  })
  groupId!: number;

  @Column({
    name: 'group_key',
    type: 'varchar',
    length: 100,
    nullable: false,
    unique: true,
    comment: 'Stable key e.g. auth, notifications',
  })
  @Index('uq_system_setting_groups_group_key', { unique: true })
  groupKey!: string;

  @Column({
    name: 'label',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  label!: string;

  @Column({
    name: 'description',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  description!: string | null;

  @Column({
    name: 'sort_order',
    type: 'int',
    unsigned: true,
    default: 0,
  })
  sortOrder!: number;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    unsigned: true,
    default: 1,
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
    default: 0,
  })
  updatedBy!: number;

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

  @OneToMany(
    () => SystemSettingDefinitionEntity,
    (definition) => definition.group,
  )
  definitions!: SystemSettingDefinitionEntity[];
}
