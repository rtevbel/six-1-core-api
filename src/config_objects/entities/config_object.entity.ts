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
import { safeMysqlJsonTransformer } from '../../common/typeorm/safe-mysql-json.transformer';
import { ConfigTemplateSetEntity } from './config_template_set.entity';
import { ConfigObjectFieldEntity } from './config_object_field.entity';
import { ConfigObjectLifecycleEntity } from './config_object_lifecycle.entity';
import { ConfigObjectViewEntity } from './config_object_view.entity';

export type ConfigObjectStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'CONFLICT';

/**
 * How instance data is stored for this config object definition.
 *
 * - `sor_bound`: one core SoR row per instance + optional `*_meta` JSON.
 * - `standalone`: instances live in `config_custom_object_instances` (payload JSON).
 * - `system_table`: platform SoR tables (§2.4); no `config_object_fields`; CRUD via existing module APIs.
 */
export type ConfigObjectBindingMode =
  | 'sor_bound'
  | 'standalone'
  | 'system_table';

/**
 * Entity class for `config_objects` table.
 *
 * Represents a configurable object type (e.g. project, task, customer)
 * bound to a template set—either backed by a system-of-record table or
 * standalone with instance rows in `config_custom_object_instances`, or
 * `system_table` for allowlisted platform tables without designer fields.
 */
@Entity('config_objects')
export class ConfigObjectEntity {
  @PrimaryGeneratedColumn({
    name: 'config_object_id',
    type: 'bigint',
    unsigned: true,
  })
  configObjectId!: number;

  @Column({
    name: 'config_template_set_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  configTemplateSetId!: number;

  @Column({
    name: 'object_type',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  objectType!: string;

  @Column({
    name: 'binding_mode',
    type: 'enum',
    enum: ['sor_bound', 'standalone', 'system_table'],
    default: 'sor_bound',
  })
  bindingMode!: ConfigObjectBindingMode;

  @Column({
    name: 'sor_table_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  sorTableName!: string | null;

  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  displayName!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'CONFLICT'],
    default: 'DRAFT',
  })
  status!: ConfigObjectStatus;

  /**
   * Optional mapping for generic email verification (token, expiry, verified field keys, TTL).
   * When null, verification actions fall back to platform defaults for the object type.
   */
  @Column({
    name: 'verification_field_map',
    type: 'text',
    nullable: true,
    transformer: safeMysqlJsonTransformer,
  })
  verificationFieldMap!: Record<string, unknown> | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
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
    () => ConfigTemplateSetEntity,
    (templateSet) => templateSet.configObjects,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'config_template_set_id' })
  templateSet!: ConfigTemplateSetEntity;

  @OneToMany(
    () => ConfigObjectFieldEntity,
    (configField) => configField.configObject,
  )
  fields!: ConfigObjectFieldEntity[];

  @OneToMany(
    () => ConfigObjectLifecycleEntity,
    (lifecycle) => lifecycle.configObject,
  )
  lifecycles!: ConfigObjectLifecycleEntity[];

  @OneToMany(() => ConfigObjectViewEntity, (view) => view.configObject)
  views!: ConfigObjectViewEntity[];
}

