import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { safeMysqlJsonTransformer } from '../../../common/typeorm/safe-mysql-json.transformer';
import {
  SYSTEM_SETTING_VALUE_TYPES,
  SystemSettingValueType,
} from '../constants';
import { SystemSettingConstraints } from '../interfaces/setting-constraints.interface';
import { SystemSettingGroupEntity } from './system-setting-group.entity';
import { SystemSettingValueEntity } from './system-setting-value.entity';

/**
 * Entity for `system_setting_definitions` — typed setting registry entries.
 */
@Entity('system_setting_definitions')
export class SystemSettingDefinitionEntity {
  @PrimaryGeneratedColumn({
    name: 'definition_id',
    type: 'bigint',
    unsigned: true,
  })
  definitionId!: number;

  @Column({
    name: 'group_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  @Index('idx_system_setting_definitions_group_id')
  groupId!: number;

  @Column({
    name: 'setting_key',
    type: 'varchar',
    length: 150,
    nullable: false,
    unique: true,
    comment: 'Stable key e.g. auth.session_timeout_seconds',
  })
  @Index('uq_system_setting_definitions_setting_key', { unique: true })
  settingKey!: string;

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
    name: 'value_type',
    type: 'enum',
    enum: SYSTEM_SETTING_VALUE_TYPES,
    nullable: false,
  })
  valueType!: SystemSettingValueType;

  @Column({
    name: 'constraints_json',
    type: 'text',
    nullable: true,
    transformer: safeMysqlJsonTransformer,
  })
  constraintsJson!: SystemSettingConstraints | null;

  @Column({
    name: 'default_value',
    type: 'text',
    nullable: true,
    transformer: safeMysqlJsonTransformer,
    comment: 'Built-in default when no global/tenant value exists',
  })
  defaultValue!: unknown;

  @Column({
    name: 'is_tenant_overridable',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  isTenantOverridable!: boolean;

  @Column({
    name: 'is_sensitive',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  isSensitive!: boolean;

  @Column({
    name: 'is_readonly',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  isReadonly!: boolean;

  @Column({
    name: 'requires_restart',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  requiresRestart!: boolean;

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

  @ManyToOne(() => SystemSettingGroupEntity, (group) => group.definitions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'group_id' })
  group!: SystemSettingGroupEntity;

  @OneToMany(() => SystemSettingValueEntity, (value) => value.definition)
  values!: SystemSettingValueEntity[];
}
