import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { safeMysqlJsonTransformer } from '../../common/typeorm/safe-mysql-json.transformer';
import { ConfigObjectEntity } from './config_object.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';

/**
 * Object-level runtime overlays for existing `system_table` base field keys.
 *
 * Does not create physical columns; stores lookup/derived authoring only.
 */
@Entity('config_object_runtime_field_metadata')
export class ConfigObjectRuntimeFieldMetadataEntity {
  @PrimaryGeneratedColumn({
    name: 'config_object_runtime_field_metadata_id',
    type: 'bigint',
    unsigned: true,
  })
  configObjectRuntimeFieldMetadataId!: number;

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
    name: 'validation_json',
    type: 'text',
    nullable: true,
    transformer: safeMysqlJsonTransformer,
  })
  validationJson!: Record<string, unknown> | null;

  @Column({
    name: 'rules_json',
    type: 'text',
    nullable: true,
    transformer: safeMysqlJsonTransformer,
  })
  rulesJson!: Record<string, unknown> | null;

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
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;

  @ManyToOne(() => ConfigObjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'config_object_id' })
  configObject!: ConfigObjectEntity;

  @ManyToOne(() => TenantUsersEntity)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  @ManyToOne(() => TenantUsersEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: TenantUsersEntity | null;
}
