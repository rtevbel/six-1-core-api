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
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { ConfigObjectEntity } from './config_object.entity';

export type ConfigTemplateSetStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'CONFLICT';

/**
 * Entity class for `config_template_sets` table.
 *
 * Represents a logical bundle of configurable objects (schema, views, rules)
 * owned by a tenant, such as a default template set for core objects.
 */
@Entity('config_template_sets')
export class ConfigTemplateSetEntity {
  @PrimaryGeneratedColumn({
    name: 'config_template_set_id',
    type: 'bigint',
    unsigned: true,
  })
  configTemplateSetId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  tenantId!: number | null;

  @Column({
    name: 'key',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  key!: string;

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
    name: 'status',
    type: 'enum',
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'CONFLICT'],
    default: 'DRAFT',
  })
  status!: ConfigTemplateSetStatus;

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

  @ManyToOne(() => TenantEntity, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity | null;

  @ManyToOne(() => TenantUsersEntity)
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  @ManyToOne(
    () => TenantUsersEntity,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: TenantUsersEntity | null;

  @OneToMany(
    () => ConfigObjectEntity,
    (configObject) => configObject.templateSet,
  )
  configObjects!: ConfigObjectEntity[];
}

