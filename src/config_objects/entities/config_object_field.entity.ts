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
import { ConfigObjectEntity } from './config_object.entity';
import { ConfigObjectFieldRuleEntity } from './config_object_field_rule.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';

/**
 * Entity class for `config_object_fields` table.
 *
 * Defines a single configurable field belonging to a config object, including
 * its key, label, type, default value, and authoring metadata.
 */
@Entity('config_object_fields')
export class ConfigObjectFieldEntity {
  @PrimaryGeneratedColumn({
    name: 'config_object_field_id',
    type: 'bigint',
    unsigned: true,
  })
  configObjectFieldId!: number;

  @Column({
    name: 'config_object_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  configObjectId!: number;

  @Column({
    name: 'field_key',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  fieldKey!: string;

  @Column({
    name: 'label',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  label!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    name: 'field_type',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  fieldType!: string;

  // `text` + transformer: MySQL `JSON` columns must not use TypeORM `json` type here —
  // the driver JSON.parses before transformers, which throws on invalid legacy values.
  @Column({
    name: 'validation_json',
    type: 'text',
    nullable: true,
    transformer: safeMysqlJsonTransformer,
  })
  validationJson!: Record<string, unknown> | null;

  @Column({
    name: 'default_value',
    type: 'text',
    nullable: true,
    transformer: safeMysqlJsonTransformer,
  })
  defaultValue!: unknown | null;

  @Column({
    name: 'is_required',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  isRequired!: boolean;

  @Column({
    name: 'is_system',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  isSystem!: boolean;

  @Column({
    name: 'order_index',
    type: 'int',
    default: 0,
  })
  orderIndex!: number;

  @Column({
    name: 'section_key',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  sectionKey!: string | null;

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
  })
  updatedBy!: number | null;

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
    () => ConfigObjectEntity,
    (configObject) => configObject.fields,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'config_object_id' })
  configObject!: ConfigObjectEntity;

  @ManyToOne(
    () => TenantUsersEntity,
    (tenantUser) => tenantUser.createdConfigObjectFields,
  )
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  @ManyToOne(
    () => TenantUsersEntity,
    (tenantUser) => tenantUser.updatedConfigObjectFields,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: TenantUsersEntity | null;

  @OneToMany(
    () => ConfigObjectFieldRuleEntity,
    (rule) => rule.configObjectField,
  )
  rules!: ConfigObjectFieldRuleEntity[];
}

