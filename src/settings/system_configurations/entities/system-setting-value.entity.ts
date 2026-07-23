import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { safeMysqlJsonTransformer } from '../../../common/typeorm/safe-mysql-json.transformer';
import { GLOBAL_SYSTEM_TENANT_ID } from '../../../tenants/system-tenant.bootstrap';
import { SystemSettingDefinitionEntity } from './system-setting-definition.entity';

/**
 * Entity for `system_setting_values`.
 * `tenant_id = 0` is the global/platform value; positive ids are tenant overrides.
 */
@Entity('system_setting_values')
@Unique('uq_system_setting_values_definition_tenant', [
  'definitionId',
  'tenantId',
])
export class SystemSettingValueEntity {
  @PrimaryGeneratedColumn({
    name: 'value_id',
    type: 'bigint',
    unsigned: true,
  })
  valueId!: number;

  @Column({
    name: 'definition_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  @Index('idx_system_setting_values_definition_id')
  definitionId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    default: GLOBAL_SYSTEM_TENANT_ID,
    comment: '0 = global; positive = tenant override',
  })
  @Index('idx_system_setting_values_tenant_id')
  tenantId!: number;

  @Column({
    name: 'value_json',
    type: 'text',
    nullable: false,
    transformer: safeMysqlJsonTransformer,
    comment: 'Plain value or encrypted secret envelope',
  })
  valueJson!: unknown;

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

  @ManyToOne(
    () => SystemSettingDefinitionEntity,
    (definition) => definition.values,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'definition_id' })
  definition!: SystemSettingDefinitionEntity;
}
